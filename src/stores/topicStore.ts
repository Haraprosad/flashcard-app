import { create } from 'zustand'
import type { FlashCard, TopicFile } from '../types'
import { gdriveService } from '../services/gdriveService'
import { indexedDBService } from '../services/indexedDBService'
import { useIndexStore } from './indexStore'

interface TopicState {
  topics: Record<string, TopicFile>
  loading: Record<string, boolean>
  error: Record<string, string | null>
  /** ISO timestamps of when each topic was last successfully fetched (in-memory, per session) */
  sessionFetchedAt: Record<string, string>

  fetchTopic: (slug: string, token: string) => Promise<TopicFile | null>
  getTopic: (slug: string) => TopicFile | null
  getCardsByTopic: (slug: string) => FlashCard[]
  getAllCachedCards: () => FlashCard[]
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: {},
  loading: {},
  error: {},
  sessionFetchedAt: {},

  fetchTopic: async (slug: string, token: string) => {
    // De-duplicate concurrent requests for the same slug
    if (get().loading[slug]) return get().topics[slug] ?? null

    // Fast path: topic is in Zustand AND was fetched in this session after meta.generated_at
    const sessionTs = get().sessionFetchedAt[slug]
    if (sessionTs && get().topics[slug]) {
      const meta = useIndexStore.getState().index?.topics.find((t) => t.slug === slug)
      if (meta && new Date(sessionTs) >= new Date(meta.generated_at)) {
        return get().topics[slug]!
      }
    }

    set((s) => ({
      loading: { ...s.loading, [slug]: true },
      error: { ...s.error, [slug]: null },
    }))

    const current = get().topics[slug] ?? null

    try {
      const fetchedAt = await indexedDBService.getTopicFetchedAt(slug)

      // Re-read meta AFTER the await to get the freshest index state
      const meta = useIndexStore.getState().index?.topics.find((t) => t.slug === slug)

      const needsFetch =
        !fetchedAt || !meta || new Date(fetchedAt) < new Date(meta.generated_at)

      if (needsFetch) {
        const data = await gdriveService.fetchTopicFile(slug, token)
        await indexedDBService.saveTopicFile(slug, data)
        const now = new Date().toISOString()
        set((s) => ({
          topics: { ...s.topics, [slug]: data },
          loading: { ...s.loading, [slug]: false },
          sessionFetchedAt: { ...s.sessionFetchedAt, [slug]: now },
        }))
        return data
      }

      const cached = await indexedDBService.getTopicFile(slug)
      if (cached) {
        const now = new Date().toISOString()
        set((s) => ({
          topics: { ...s.topics, [slug]: cached },
          loading: { ...s.loading, [slug]: false },
          sessionFetchedAt: { ...s.sessionFetchedAt, [slug]: now },
        }))
        return cached
      }

      // IDB miss despite fetchedAt existing — re-fetch from Drive
      const data = await gdriveService.fetchTopicFile(slug, token)
      await indexedDBService.saveTopicFile(slug, data)
      const now = new Date().toISOString()
      set((s) => ({
        topics: { ...s.topics, [slug]: data },
        loading: { ...s.loading, [slug]: false },
        sessionFetchedAt: { ...s.sessionFetchedAt, [slug]: now },
      }))
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch topic'
      set((s) => ({
        loading: { ...s.loading, [slug]: false },
        error: { ...s.error, [slug]: message },
      }))
      return current
    }
  },

  getTopic: (slug: string) => {
    return get().topics[slug] ?? null
  },

  getCardsByTopic: (slug: string) => {
    return get().topics[slug]?.cards ?? []
  },

  getAllCachedCards: () => {
    return Object.values(get().topics).flatMap((t) => t.cards)
  },
}))
