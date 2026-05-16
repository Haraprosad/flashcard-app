import { openDB } from 'idb'
import type { FlashcardsIndex, TopicFile } from '../types'

interface FlashcardDBSchema {
  'index': { key: string; value: FlashcardsIndex & { _key: string } }
  'topics': { key: string; value: TopicFile & { _key: string; fetchedAt: string } }
  'meta': { key: string; value: { _key: string; value: unknown } }
}

const DB_NAME = 'flashcard-app-db'
const DB_VERSION = 1

let dbPromise: ReturnType<typeof openDB<FlashcardDBSchema>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FlashcardDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('index')) {
          db.createObjectStore('index', { keyPath: '_key' })
        }
        if (!db.objectStoreNames.contains('topics')) {
          db.createObjectStore('topics', { keyPath: '_key' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: '_key' })
        }
      },
    })
  }
  return dbPromise
}

export const indexedDBService = {
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

  async getFolderIds(): Promise<Record<string, string>> {
    const db = await getDB()
    const data = await db.get('meta', 'folderIds')
    return (data?.value as Record<string, string>) ?? {}
  },

  async saveFolderIds(ids: Record<string, string>): Promise<void> {
    const db = await getDB()
    await db.put('meta', { _key: 'folderIds', value: ids })
  },

  async getCachedTopicStats(): Promise<{ topicCount: number; cardCount: number }> {
    const db = await getDB()
    const all = await db.getAll('topics')
    const topicCount = all.length
    const cardCount = all.reduce((sum, t) => sum + (t.cards?.length ?? 0), 0)
    return { topicCount, cardCount }
  },
}
