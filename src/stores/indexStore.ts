import { create } from 'zustand'
import type { FlashcardsIndex, TopicMeta } from '../types'
import { gdriveService } from '../services/gdriveService'
import { indexedDBService } from '../services/indexedDBService'

interface IndexState {
  index: FlashcardsIndex | null
  topics: TopicMeta[]
  loading: boolean
  error: string | null
  isOffline: boolean
  fetchIndexFromDrive: (token: string) => Promise<void>
}

export const useIndexStore = create<IndexState>((set) => ({
  index: null,
  topics: [],
  loading: false,
  error: null,
  isOffline: false,

  fetchIndexFromDrive: async (token: string) => {
    set({ loading: true, error: null })
    try {
      const index = await gdriveService.fetchIndex(token)
      await indexedDBService.saveIndex(index)
      localStorage.setItem('last_synced_at', new Date().toISOString())
      set({ index, topics: index.topics, loading: false, isOffline: false })
    } catch (err) {
      try {
        const cached = await indexedDBService.getIndex()
        if (cached) {
          set({ index: cached, topics: cached.topics, loading: false, isOffline: true })
          return
        }
      } catch {
        // cache read failed
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch index'
      set({ loading: false, error: message, isOffline: true })
    }
  },
}))
