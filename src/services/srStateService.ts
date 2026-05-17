import type { CardSRData, SRState } from '../types'
import { indexedDBService } from './indexedDBService'

// In-memory cache — loaded from IDB once on init()
let _srCache: SRState = {}
let _explored: string[] = []
let _initialized = false

async function doInit(): Promise<void> {
  _srCache = await indexedDBService.getAllSRState()
  _explored = await indexedDBService.getExploredConcepts()
  _initialized = true
}

export const srStateService = {
  /**
   * Pre-load all SR state from IDB into memory. Call once on app start.
   * Safe to call multiple times — resolves immediately after first load.
   */
  async init(): Promise<void> {
    if (_initialized) return
    await doInit()
  },

  /** Sync read from in-memory cache. */
  getSRState(): SRState {
    return _srCache
  },

  getCardSRData(cardId: string): CardSRData | null {
    return _srCache[cardId] ?? null
  },

  getDueCardIds(cardIds: string[]): string[] {
    const now = new Date()
    return cardIds.filter((id) => {
      const data = _srCache[id]
      if (!data) return false
      return new Date(data.due) <= now
    })
  },

  getMasteryStats(cardIds: string[]): { mastered: number; total: number; masteryPct: number } {
    let mastered = 0
    for (const id of cardIds) {
      const data = _srCache[id]
      if (data && data.state === 2 && data.reps >= 3) {
        mastered++
      }
    }
    const total = cardIds.length
    const masteryPct = total > 0 ? (mastered / total) * 100 : 0
    return { mastered, total, masteryPct }
  },

  /** Update cache immediately; write to IDB in background. */
  updateCard(cardId: string, srData: CardSRData): void {
    _srCache[cardId] = srData
    void indexedDBService.putSRStateEntry(cardId, srData)
  },

  async resetAllState(): Promise<void> {
    _srCache = {}
    _explored = []
    await indexedDBService.resetAllSRData()
  },

  markExplored(conceptId: string): void {
    if (!_explored.includes(conceptId)) {
      _explored.push(conceptId)
      void indexedDBService.saveExploredConcepts(_explored)
    }
  },

  isExplored(conceptId: string): boolean {
    return _explored.includes(conceptId)
  },

  getExploredConceptIds(): string[] {
    return _explored
  },

  resetExploredConcepts(): void {
    _explored = []
    void indexedDBService.saveExploredConcepts([])
  },

  /**
   * Overwrite in-memory SR cache from an externally merged state (e.g. after Drive merge).
   * Also persists each entry to IDB.
   */
  async bulkSetSRState(state: SRState): Promise<void> {
    _srCache = { ...state }
    await indexedDBService.clearSRState()
    for (const [cardId, data] of Object.entries(state)) {
      await indexedDBService.putSRStateEntry(cardId, data)
    }
  },

  /**
   * Overwrite explored concepts from an externally merged set.
   */
  async bulkSetExplored(ids: string[]): Promise<void> {
    _explored = [...ids]
    await indexedDBService.saveExploredConcepts(ids)
  },

  // Used for resetting the singleton in tests
  _resetForTests(): void {
    _srCache = {}
    _explored = []
    _initialized = false
  },

  _setSRStateForTests(state: SRState): void {
    _srCache = { ...state }
    _initialized = true
  },

  _deleteCardForTests(cardId: string): void {
    delete _srCache[cardId]
  },

  _setExploredForTests(ids: string[]): void {
    _explored = [...ids]
    _initialized = true
  },
}
