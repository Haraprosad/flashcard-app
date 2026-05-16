import { create } from 'zustand'
import type { FlashCard, Rating } from '../types'
import { fsrsService } from '../services/fsrsService'
import { srStateService } from '../services/srStateService'
import { progressStore } from './progressStore'

const NEW_CARD_CAP = 20

interface ReviewState {
  topicSlug: string | null
  queue: FlashCard[]
  currentIndex: number
  isFlipped: boolean
  reviewedCount: number
  isComplete: boolean
  sessionStartTime: number | null

  loadSession: (slug: string, cards: FlashCard[]) => void
  flip: () => void
  rate: (rating: Rating) => void
  getCurrentCard: () => FlashCard | null
  getDueCards: (cards: FlashCard[]) => FlashCard[]
  reset: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  topicSlug: null,
  queue: [],
  currentIndex: 0,
  isFlipped: false,
  reviewedCount: 0,
  isComplete: false,
  sessionStartTime: null,

  loadSession: (slug: string, cards: FlashCard[]) => {
    const srState = srStateService.getSRState()
    const now = new Date()

    const dueCards: FlashCard[] = []
    const newCards: FlashCard[] = []

    for (const card of cards) {
      const data = srState[card.id]
      if (!data) {
        newCards.push(card)
      } else if (new Date(data.due) <= now) {
        dueCards.push(card)
      }
    }

    const cappedNew = newCards.slice(0, NEW_CARD_CAP)
    const queue = [...dueCards, ...cappedNew]

    set({
      topicSlug: slug,
      queue,
      currentIndex: 0,
      isFlipped: false,
      reviewedCount: 0,
      isComplete: queue.length === 0,
      sessionStartTime: Date.now(),
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

    set({
      queue: newQueue,
      currentIndex: nextIndex,
      isFlipped: false,
      reviewedCount: reviewedCount + 1,
      isComplete: nextIndex >= newQueue.length,
    })
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
      queue: [],
      currentIndex: 0,
      isFlipped: false,
      reviewedCount: 0,
      isComplete: false,
      sessionStartTime: null,
    })
  },
}))
