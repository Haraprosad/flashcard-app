import type { StreakData, ReviewLogEntry, TopicStats, FlashCard } from '../types'
import { srStateService } from '../services/srStateService'
import { indexedDBService } from '../services/indexedDBService'

// In-memory cache
let _streakData: StreakData = { current: 0, longest: 0, last_review_date: null }
let _reviewLog: Record<string, number> = {}
let _initialized = false

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
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
  async init(): Promise<void> {
    if (_initialized) return
    const [streak, log] = await Promise.all([
      indexedDBService.getStreakData(),
      indexedDBService.getAllReviewLog(),
    ])
    _streakData = streak ?? { current: 0, longest: 0, last_review_date: null }
    _reviewLog = log
    _initialized = true
  },

  recordReview(_cardId: string, _rating: string): void {
    const today = todayStr()

    _reviewLog[today] = (_reviewLog[today] ?? 0) + 1
    void indexedDBService.putReviewLogEntry(today, _reviewLog[today])

    if (_streakData.last_review_date === today) return

    const broken = _streakData.last_review_date
      ? isStreakBroken(_streakData.last_review_date)
      : false
    const newCurrent = broken ? 1 : _streakData.current + 1

    _streakData = {
      current: newCurrent,
      longest: Math.max(_streakData.longest, newCurrent),
      last_review_date: today,
    }
    void indexedDBService.saveStreakData(_streakData)
  },

  getStreakData(): StreakData {
    if (_streakData.last_review_date && isStreakBroken(_streakData.last_review_date)) {
      return { current: 0, longest: _streakData.longest, last_review_date: _streakData.last_review_date }
    }
    return _streakData
  },

  getHeatmapData(): ReviewLogEntry[] {
    const entries: ReviewLogEntry[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = dateStr(d)
      entries.push({ date: ds, count: _reviewLog[ds] ?? 0 })
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
    return Object.values(_reviewLog).reduce((sum, c) => sum + c, 0)
  },

  /**
   * Overwrite in-memory caches from an externally merged state (after Drive merge).
   */
  async bulkSetData(
    streak: StreakData,
    reviewLog: Record<string, number>,
  ): Promise<void> {
    _streakData = { ...streak }
    _reviewLog = { ...reviewLog }
    await indexedDBService.saveStreakData(streak)
    await indexedDBService.clearReviewLog()
    for (const [date, count] of Object.entries(reviewLog)) {
      await indexedDBService.putReviewLogEntry(date, count)
    }
  },

  // Used for resetting the singleton in tests
  _resetForTests(): void {
    _streakData = { current: 0, longest: 0, last_review_date: null }
    _reviewLog = {}
    _initialized = false
  },

  _setStreakDataForTests(data: StreakData): void {
    _streakData = { ...data }
    _initialized = true
  },

  _setReviewLogForTests(log: Record<string, number>): void {
    _reviewLog = { ...log }
    _initialized = true
  },
}
