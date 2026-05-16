import { fsrs, createEmptyCard, Rating as FsrsRating } from 'ts-fsrs'
import type { State } from 'ts-fsrs'
import type { FlashCard, CardSRData, Rating, SRState } from '../types'

const scheduler = fsrs()

function srDataToCard(srData: CardSRData | null): ReturnType<typeof createEmptyCard> {
  if (!srData) return createEmptyCard()
  return {
    due: new Date(srData.due),
    stability: srData.stability,
    difficulty: srData.difficulty,
    elapsed_days: srData.elapsed_days,
    scheduled_days: srData.scheduled_days,
    learning_steps: 0,
    reps: srData.reps,
    lapses: srData.lapses,
    state: srData.state as State,
    last_review: srData.last_review ? new Date(srData.last_review) : undefined,
  }
}

function cardToSRData(card: ReturnType<typeof createEmptyCard>): CardSRData {
  return {
    due: card.due instanceof Date ? card.due.toISOString() : new Date(card.due).toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as 0 | 1 | 2 | 3,
    last_review: card.last_review
      ? (card.last_review instanceof Date ? card.last_review.toISOString() : new Date(card.last_review).toISOString())
      : new Date().toISOString(),
  }
}

function ratingToFsrs(rating: Rating): FsrsRating {
  switch (rating) {
    case 'Again': return FsrsRating.Again
    case 'Hard': return FsrsRating.Hard
    case 'Good': return FsrsRating.Good
    case 'Easy': return FsrsRating.Easy
  }
}

function formatInterval(dueDate: Date, now: Date): string {
  const diffMs = dueDate.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 1) return '<1m'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.round(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d`
  const diffMonths = Math.round(diffDays / 30)
  return `${diffMonths}mo`
}

export const fsrsService = {
  rateCard(card: FlashCard, srData: CardSRData | null, rating: Rating): CardSRData {
    const fsrsCard = srDataToCard(srData)
    const now = new Date()
    const result = scheduler.repeat(fsrsCard, now)
    const fsrsRating = ratingToFsrs(rating)
    return cardToSRData(result[fsrsRating].card)
  },

  getDueCards(cards: FlashCard[], srState: SRState): FlashCard[] {
    const now = new Date()
    return cards.filter((card) => {
      const data = srState[card.id]
      if (!data) return true
      return new Date(data.due) <= now
    })
  },

  getNextIntervals(card: FlashCard, srData: CardSRData | null): Record<Rating, string> {
    const fsrsCard = srDataToCard(srData)
    const now = new Date()
    const result = scheduler.repeat(fsrsCard, now)
    return {
      Again: formatInterval(result[FsrsRating.Again].card.due, now),
      Hard: formatInterval(result[FsrsRating.Hard].card.due, now),
      Good: formatInterval(result[FsrsRating.Good].card.due, now),
      Easy: formatInterval(result[FsrsRating.Easy].card.due, now),
    }
  },
}
