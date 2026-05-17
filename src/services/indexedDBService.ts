import { openDB } from 'idb'
import type { FlashcardsIndex, TopicFile, CardSRData, StreakData } from '../types'

interface FlashcardDBSchema {
  'index': { key: string; value: FlashcardsIndex & { _key: string } }
  'topics': { key: string; value: TopicFile & { _key: string; fetchedAt: string } }
  'meta': { key: string; value: { _key: string; value: unknown } }
  'sr_state': { key: string; value: CardSRData & { cardId: string } }
  'review_log': { key: number; value: { id?: number; date: string; count: number } }
}

const DB_NAME = 'concept-snap-db'
const DB_VERSION = 2

let dbPromise: ReturnType<typeof openDB<FlashcardDBSchema>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FlashcardDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        // v1 stores
        if (!db.objectStoreNames.contains('index')) {
          db.createObjectStore('index', { keyPath: '_key' })
        }
        if (!db.objectStoreNames.contains('topics')) {
          db.createObjectStore('topics', { keyPath: '_key' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: '_key' })
        }

        // v2 stores — migrate localStorage data on first open
        if (oldVersion < 2) {
          db.createObjectStore('sr_state', { keyPath: 'cardId' })
          db.createObjectStore('review_log', { keyPath: 'id', autoIncrement: true })

          // Migrate sr_state from localStorage
          try {
            const rawSR = typeof localStorage !== 'undefined' ? localStorage.getItem('sr_state') : null
            if (rawSR) {
              const srState = JSON.parse(rawSR) as Record<string, CardSRData>
              for (const [cardId, data] of Object.entries(srState)) {
                void tx.objectStore('sr_state').put({ ...data, cardId })
              }
              localStorage.removeItem('sr_state')
            }
          } catch { /* ignore migration errors */ }

          // Migrate review_log from localStorage
          try {
            const rawLog = typeof localStorage !== 'undefined' ? localStorage.getItem('review_log') : null
            if (rawLog) {
              const log = JSON.parse(rawLog) as Record<string, number>
              for (const [date, count] of Object.entries(log)) {
                void tx.objectStore('review_log').put({ date, count })
              }
              localStorage.removeItem('review_log')
            }
          } catch { /* ignore */ }

          // Migrate streak_data to meta
          try {
            const rawStreak = typeof localStorage !== 'undefined' ? localStorage.getItem('streak_data') : null
            if (rawStreak) {
              void tx.objectStore('meta').put({ _key: 'streak_data', value: JSON.parse(rawStreak) })
              localStorage.removeItem('streak_data')
            }
          } catch { /* ignore */ }

          // Migrate explored_concepts to meta
          try {
            const rawExplored = typeof localStorage !== 'undefined' ? localStorage.getItem('explored_concepts') : null
            if (rawExplored) {
              void tx.objectStore('meta').put({ _key: 'explored_concepts', value: JSON.parse(rawExplored) })
              localStorage.removeItem('explored_concepts')
            }
          } catch { /* ignore */ }
        }
      },
    })
  }
  return dbPromise
}

export const indexedDBService = {
  // ─── Index store ─────────────────────────────────────────────────────────

  async saveIndex(index: FlashcardsIndex): Promise<void> {
    const db = await getDB()
    await db.put('index', { ...index, _key: 'current' })
  },

  async getIndex(): Promise<FlashcardsIndex | null> {
    const db = await getDB()
    const data = await db.get('index', 'current')
    if (!data) return null
    const { _key: _, ...rest } = data
    return rest as FlashcardsIndex
  },

  // ─── Topics store ─────────────────────────────────────────────────────────

  async saveTopicFile(slug: string, fileData: TopicFile): Promise<void> {
    const db = await getDB()
    await db.put('topics', { ...fileData, _key: slug, fetchedAt: new Date().toISOString() })
  },

  async getTopicFile(slug: string): Promise<TopicFile | null> {
    const db = await getDB()
    const data = await db.get('topics', slug)
    if (!data) return null
    const { _key: _, fetchedAt: __, ...rest } = data
    return rest as TopicFile
  },

  async getTopicFetchedAt(slug: string): Promise<string | null> {
    const db = await getDB()
    const data = await db.get('topics', slug)
    return data?.fetchedAt ?? null
  },

  async clearTopicCache(): Promise<void> {
    const db = await getDB()
    await db.clear('topics')
  },

  // ─── Meta store ───────────────────────────────────────────────────────────

  async getFolderIds(): Promise<Record<string, string>> {
    const db = await getDB()
    const data = await db.get('meta', 'folderIds')
    return (data?.value as Record<string, string>) ?? {}
  },

  async saveFolderIds(ids: Record<string, string>): Promise<void> {
    const db = await getDB()
    await db.put('meta', { _key: 'folderIds', value: ids })
  },

  async getMetaValue<T>(key: string): Promise<T | null> {
    const db = await getDB()
    const data = await db.get('meta', key)
    return data ? (data.value as T) : null
  },

  async setMetaValue(key: string, value: unknown): Promise<void> {
    const db = await getDB()
    await db.put('meta', { _key: key, value })
  },

  async deleteMetaValue(key: string): Promise<void> {
    const db = await getDB()
    await db.delete('meta', key)
  },

  async getCachedTopicStats(): Promise<{ topicCount: number; cardCount: number }> {
    const db = await getDB()
    const all = await db.getAll('topics')
    const topicCount = all.length
    const cardCount = all.reduce((sum, t) => sum + (t.cards?.length ?? 0), 0)
    return { topicCount, cardCount }
  },

  // ─── SR State store ───────────────────────────────────────────────────────

  async putSRStateEntry(cardId: string, data: CardSRData): Promise<void> {
    const db = await getDB()
    await db.put('sr_state', { ...data, cardId })
  },

  async getAllSRState(): Promise<Record<string, CardSRData>> {
    const db = await getDB()
    const all = await db.getAll('sr_state')
    const result: Record<string, CardSRData> = {}
    for (const entry of all) {
      const { cardId, ...data } = entry
      result[cardId] = data as CardSRData
    }
    return result
  },

  async clearSRState(): Promise<void> {
    const db = await getDB()
    await db.clear('sr_state')
  },

  // ─── Review Log store ─────────────────────────────────────────────────────

  async putReviewLogEntry(date: string, count: number): Promise<void> {
    const db = await getDB()
    // Upsert: check if entry for date exists, update count, else insert
    const tx = db.transaction('review_log', 'readwrite')
    const all = await tx.store.getAll()
    const existing = all.find((e) => e.date === date)
    if (existing?.id !== undefined) {
      await tx.store.put({ id: existing.id, date, count })
    } else {
      await tx.store.put({ date, count })
    }
    await tx.done
  },

  async getAllReviewLog(): Promise<Record<string, number>> {
    const db = await getDB()
    const all = await db.getAll('review_log')
    const result: Record<string, number> = {}
    for (const entry of all) {
      result[entry.date] = (result[entry.date] ?? 0) + entry.count
    }
    return result
  },

  async clearReviewLog(): Promise<void> {
    const db = await getDB()
    await db.clear('review_log')
  },

  // ─── Streak Data (via meta) ───────────────────────────────────────────────

  async getStreakData(): Promise<StreakData | null> {
    return this.getMetaValue<StreakData>('streak_data')
  },

  async saveStreakData(data: StreakData): Promise<void> {
    return this.setMetaValue('streak_data', data)
  },

  // ─── Explored Concepts (via meta) ─────────────────────────────────────────

  async getExploredConcepts(): Promise<string[]> {
    return (await this.getMetaValue<string[]>('explored_concepts')) ?? []
  },

  async saveExploredConcepts(ids: string[]): Promise<void> {
    return this.setMetaValue('explored_concepts', ids)
  },

  // ─── Device ID (via meta) ─────────────────────────────────────────────────

  async getDeviceId(): Promise<string> {
    const existing = await this.getMetaValue<string>('device_id')
    if (existing) return existing
    const newId = crypto.randomUUID()
    await this.setMetaValue('device_id', newId)
    return newId
  },

  // ─── Reset all SR-related data ────────────────────────────────────────────

  async resetAllSRData(): Promise<void> {
    const db = await getDB()
    await db.clear('sr_state')
    await db.clear('review_log')
    await db.delete('meta', 'streak_data')
    await db.delete('meta', 'explored_concepts')
    await db.delete('meta', 'sr_state_synced_at')
    await db.delete('meta', 'sr_state_pending_upload')
  },

  // Used for resetting the singleton in tests
  _resetForTests(): void {
    dbPromise = null
  },
}
