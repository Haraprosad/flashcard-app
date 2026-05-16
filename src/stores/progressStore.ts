import type { StreakData, ReviewLogEntry, TopicStats, FlashCard } from '../types'
import { srStateService } from '../services/srStateService'

const STREAK_KEY = 'streak_data'
const REVIEW_LOG_KEY = 'review_log'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function readStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return { current: 0, longest: 0, last_review_date: null }
    return JSON.parse(raw) as StreakData
  } catch {
    return { current: 0, longest: 0, last_review_date: null }
  }
}

function readReviewLog(): Record<string, number> {
  try {
    const raw = localStorage.getItem(REVIEW_LOG_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

function writeStreakData(data: StreakData): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data))
}

function writeReviewLog(log: Record<string, number>): void {
  localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(log))
}

function isStreakBroken(lastDate: string): boolean {
  const today = todayStr()
  if (lastDate === today) return false
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return lastDate !== dateStr(yesterday)
}

export function getHeatmapLevel(count: number): number {
  if (count === 0) return 0
  if (count < 5) return 1
  if (count < 10) return 2
  return 3
}

export const progressStore = {
  recordReview(_cardId: string, _rating: string): void {
    const today = todayStr()

    const log = readReviewLog()
    log[today] = (log[today] ?? 0) + 1
    writeReviewLog(log)

    const streak = readStreakData()
    if (streak.last_review_date === today) return

    const broken = streak.last_review_date ? isStreakBroken(streak.last_review_date) : false
    const newCurrent = broken ? 1 : streak.current + 1

    writeStreakData({
      current: newCurrent,
      longest: Math.max(streak.longest, newCurrent),
      last_review_date: today,
    })
  },

  getStreakData(): StreakData {
    const streak = readStreakData()
    if (streak.last_review_date && isStreakBroken(streak.last_review_date)) {
      return { current: 0, longest: streak.longest, last_review_date: streak.last_review_date }
    }
    return streak
  },

  getHeatmapData(): ReviewLogEntry[] {
    const log = readReviewLog()
    const entries: ReviewLogEntry[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = dateStr(d)
      entries.push({ date: ds, count: log[ds] ?? 0 })
    }
    return entries
  },

  getTopicStats(slug: string, cards: FlashCard[]): TopicStats {
    const cardIds = cards.map((c) => c.id)
    const srState = srStateService.getSRState()

    let mastered = 0
    let learning = 0
    let newCards = 0

    for (const id of cardIds) {
      const data = srState[id]
      if (!data || data.state === 0) {
        newCards++
      } else if (data.state === 1 || data.state === 3) {
        learning++
      } else if (data.state === 2) {
        if (data.reps >= 3) mastered++
        else learning++
      }
    }

    const total = cards.length
    const masteryPct = total > 0 ? (mastered / total) * 100 : 0
    const dueToday = srStateService.getDueCardIds(cardIds).length

    return { slug, total, mastered, learning, newCards, masteryPct, dueToday }
  },

  getTotalReviews(): number {
    const log = readReviewLog()
    return Object.values(log).reduce((sum, c) => sum + c, 0)
  },
}
