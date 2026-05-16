import type { CardSRData, SRState } from '../types'

const SR_STATE_KEY = 'sr_state'

function readSRState(): SRState {
  try {
    const raw = localStorage.getItem(SR_STATE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SRState
  } catch {
    return {}
  }
}

export const srStateService = {
  getSRState(): SRState {
    return readSRState()
  },

  getCardSRData(cardId: string): CardSRData | null {
    const state = readSRState()
    return state[cardId] ?? null
  },

  getDueCardIds(cardIds: string[]): string[] {
    const state = readSRState()
    const now = new Date()
    return cardIds.filter((id) => {
      const data = state[id]
      if (!data) return false
      return new Date(data.due) <= now
    })
  },

  getMasteryStats(cardIds: string[]): { mastered: number; total: number; masteryPct: number } {
    const state = readSRState()
    let mastered = 0
    for (const id of cardIds) {
      const data = state[id]
      if (data && data.state === 2 && data.reps >= 3) {
        mastered++
      }
    }
    const total = cardIds.length
    const masteryPct = total > 0 ? (mastered / total) * 100 : 0
    return { mastered, total, masteryPct }
  },

  updateCard(cardId: string, srData: CardSRData): void {
    const state = readSRState()
    state[cardId] = srData
    localStorage.setItem(SR_STATE_KEY, JSON.stringify(state))
  },

  resetAllState(): void {
    localStorage.removeItem(SR_STATE_KEY)
    localStorage.removeItem('streak_data')
    localStorage.removeItem('review_log')
  },
}
