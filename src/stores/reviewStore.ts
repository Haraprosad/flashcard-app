import { create } from 'zustand'
import type { FlashCard, Rating } from '../types'
import { fsrsService } from '../services/fsrsService'
import { srStateService } from '../services/srStateService'
import { getTierEligibleCards } from '../services/tierService'
import { progressStore } from './progressStore'
import { srStateDriveService } from '../services/srStateDriveService'
import { indexedDBService } from '../services/indexedDBService'
import { useAuthStore } from './authStore'

export type SessionMode = 'review' | 'fresh'

const NEW_CARD_CAP = 20

interface ReviewState {
  topicSlug: string | null
  allCards: FlashCard[]       // all cards for the session topic(s) — used for re-eval after exploration
  queue: FlashCard[]
  currentIndex: number
  isFlipped: boolean
  reviewedCount: number
  isComplete: boolean
  sessionStartTime: number | null
  driveSyncStatus: 'idle' | 'syncing' | 'synced' | 'failed'

  mode: SessionMode
  loadSession: (slug: string, cards: FlashCard[], mode?: SessionMode) => void
  flip: () => void
  rate: (rating: Rating) => void
  advanceExploration: (conceptId: string) => void
  getCurrentCard: () => FlashCard | null
  getDueCards: (cards: FlashCard[]) => FlashCard[]
  reset: () => void
}

async function pushSRStateToDrive(): Promise<void> {
  const token = useAuthStore.getState().accessToken
  if (!token) return
  try {
    const srState = srStateService.getSRState()
    const explored = srStateService.getExploredConceptIds()
    const reviewLog = await indexedDBService.getAllReviewLog()
    const streak = progressStore.getStreakData()
    const payload = await srStateDriveService.buildPayload(srState, explored, reviewLog, streak)
    await srStateDriveService.pushSRState(token, payload)
    useReviewStore.setState({ driveSyncStatus: 'synced' })
  } catch {
    useReviewStore.setState({ driveSyncStatus: 'failed' })
  }
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  topicSlug: null,
  mode: 'review',
  allCards: [],
  queue: [],
  currentIndex: 0,
  isFlipped: false,
  reviewedCount: 0,
  isComplete: false,
  sessionStartTime: null,
  driveSyncStatus: 'idle',

  loadSession: (slug: string, cards: FlashCard[], mode: SessionMode = 'review') => {
    const srState = srStateService.getSRState()
    const now = new Date()

    let queue: FlashCard[]

    if (mode === 'fresh') {
      // Fresh mode: include ALL exploration cards (ignore explored status) +
      // ALL non-exploration cards (ignore SR due dates / tier gating)
      const seen = new Set<string>()
      const explorationItems: FlashCard[] = []
      const regularCards: FlashCard[] = []

      for (const card of cards) {
        if (card.type === 'exploration') {
          if (card.concept_id && !seen.has(card.concept_id)) {
            seen.add(card.concept_id)
            explorationItems.push(card)
          } else if (!card.concept_id) {
            explorationItems.push(card)
          }
        } else {
          regularCards.push(card)
        }
      }

      queue = [...explorationItems, ...regularCards]
    } else {
      // Review mode: FSRS-gated — unexplored explorations + due/new cards only
      const seen = new Set<string>()
      const explorationItems: FlashCard[] = []
      for (const card of cards) {
        if (
          card.type === 'exploration' &&
          card.concept_id &&
          !srStateService.isExplored(card.concept_id) &&
          !seen.has(card.concept_id)
        ) {
          seen.add(card.concept_id)
          explorationItems.push(card)
        }
      }

      // Apply tier gating — excludes exploration cards + gated FSRS cards
      const eligibleCards = getTierEligibleCards(cards, srState)

      const dueCards: FlashCard[] = []
      const newCards: FlashCard[] = []

      for (const card of eligibleCards) {
        const data = srState[card.id]
        if (!data) {
          newCards.push(card)
        } else if (new Date(data.due) <= now) {
          dueCards.push(card)
        }
      }

      const cappedNew = newCards.slice(0, NEW_CARD_CAP)
      queue = [...explorationItems, ...dueCards, ...cappedNew]
    }

    set({
      topicSlug: slug,
      mode,
      allCards: cards,
      queue,
      currentIndex: 0,
      isFlipped: false,
      reviewedCount: 0,
      isComplete: queue.length === 0,
      sessionStartTime: Date.now(),
    })
  },

  advanceExploration: (conceptId: string) => {
    const { allCards, queue, currentIndex } = get()
    srStateService.markExplored(conceptId)

    const srState = srStateService.getSRState()
    const now = new Date()

    // Recompute eligible FSRS cards for this concept now that it's explored
    const conceptCards = allCards.filter(
      (c) => c.concept_id === conceptId && c.type !== 'exploration',
    )
    const eligible = getTierEligibleCards(conceptCards, srState)

    const alreadyQueued = new Set(queue.map((c) => c.id))
    const toAdd: FlashCard[] = []
    for (const card of eligible) {
      if (!alreadyQueued.has(card.id)) {
        const data = srState[card.id]
        if (!data || new Date(data.due) <= now) {
          toAdd.push(card)
        }
      }
    }

    const nextIndex = currentIndex + 1
    const newQueue = [...queue, ...toAdd]

    set({
      queue: newQueue,
      currentIndex: nextIndex,
      isFlipped: false,
      isComplete: nextIndex >= newQueue.length,
    })
  },

  flip: () => {
    set({ isFlipped: true })
  },

  rate: (rating: Rating) => {
    const { queue, currentIndex, reviewedCount } = get()
    const currentCard = queue[currentIndex]
    if (!currentCard) return

    const srData = srStateService.getCardSRData(currentCard.id)
    const newSrData = fsrsService.rateCard(currentCard, srData, rating)
    srStateService.updateCard(currentCard.id, newSrData)
    progressStore.recordReview(currentCard.id, rating)

    const newQueue = rating === 'Again' ? [...queue, currentCard] : queue
    const nextIndex = currentIndex + 1
    const isComplete = nextIndex >= newQueue.length

    set({
      queue: newQueue,
      currentIndex: nextIndex,
      isFlipped: false,
      reviewedCount: reviewedCount + 1,
      isComplete,
      driveSyncStatus: isComplete ? 'syncing' : get().driveSyncStatus,
    })

    // Fire-and-forget Drive push when session completes
    if (isComplete) {
      void pushSRStateToDrive()
    }
  },

  getCurrentCard: () => {
    const { queue, currentIndex } = get()
    return queue[currentIndex] ?? null
  },

  getDueCards: (cards: FlashCard[]) => {
    return fsrsService.getDueCards(cards, srStateService.getSRState())
  },

  reset: () => {
    set({
      topicSlug: null,
      mode: 'review',
      allCards: [],
      queue: [],
      currentIndex: 0,
      isFlipped: false,
      reviewedCount: 0,
      isComplete: false,
      sessionStartTime: null,
      driveSyncStatus: 'idle',
    })
  },
}))
