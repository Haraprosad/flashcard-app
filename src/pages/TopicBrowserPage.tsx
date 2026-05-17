import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useIndexStore } from '../stores/indexStore'
import { useTopicStore } from '../stores/topicStore'
import { srStateService } from '../services/srStateService'
import { SearchBar } from '../components/SearchBar'
import { TopicCard } from '../components/TopicCard'
import { OfflineBanner } from '../components/OfflineBanner'
import { Skeleton } from '../components/Skeleton'

export function TopicBrowserPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { index, topics, loading, error, isOffline, fetchIndexFromDrive } = useIndexStore()
  const topicFiles = useTopicStore((s) => s.topics)
  const fetchTopic = useTopicStore((s) => s.fetchTopic)
  const [query, setQuery] = useState('')
  const syncedIndex = useRef<string | null>(null)

  useEffect(() => {
    if (accessToken && !index) {
      fetchIndexFromDrive(accessToken)
    }
  }, [accessToken, fetchIndexFromDrive, index])

  useEffect(() => {
    if (accessToken && index && syncedIndex.current !== index.generated_at) {
      syncedIndex.current = index.generated_at
      for (const t of index.topics) {
        fetchTopic(t.slug, accessToken)
      }
    }
  }, [accessToken, index, fetchTopic])

  const filteredTopics = useMemo(() => {
    if (!query.trim()) return topics
    const lower = query.toLowerCase()
    return topics.filter(
      (t) => t.title.toLowerCase().includes(lower) || t.slug.toLowerCase().includes(lower),
    )
  }, [topics, query])

  const dueCountsMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const topic of topics) {
      const tf = topicFiles[topic.slug]
      map[topic.slug] = tf ? srStateService.getDueCardIds(tf.cards.map((c) => c.id)).length : 0
    }
    return map
  }, [topics, topicFiles])

  const masteryMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const topic of topics) {
      const tf = topicFiles[topic.slug]
      map[topic.slug] = tf
        ? srStateService.getMasteryStats(tf.cards.map((c) => c.id)).masteryPct
        : 0
    }
    return map
  }, [topics, topicFiles])

  const totalDue = useMemo(
    () => Object.values(dueCountsMap).reduce((sum, n) => sum + n, 0),
    [dueCountsMap],
  )

  if (loading || (!index && !error)) {
    return (
      <div
        data-testid="loading-state"
        role="status"
        aria-label="Loading topics"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {/* Search bar skeleton */}
        <Skeleton height="48px" borderRadius="12px" />
        {/* Topic card skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '0.5px solid var(--bg-border)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <Skeleton height="20px" width="60%" borderRadius="6px" />
                <Skeleton height="14px" width="30%" borderRadius="6px" />
              </div>
            </div>
            <Skeleton height="3px" borderRadius="2px" />
          </div>
        ))}
      </div>
    )
  }

  if (error && !topics.length) {
    const isNotFound = error.toLowerCase().includes('not found') || error.toLowerCase().includes('index.json')
    return (
      <div
        data-testid="error-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          paddingTop: 'calc(48px + env(safe-area-inset-top))',
          maxWidth: '400px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <OfflineBanner />
        <div
          style={{
            fontSize: '40px',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {isNotFound ? '📭' : '⚠️'}
        </div>
        <p
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '22px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {isNotFound ? 'No flashcards found' : 'Could not load topics'}
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {isNotFound
            ? 'Your vault has no flashcard data yet. Run the sync script from your terminal to generate flashcards from your Obsidian notes.'
            : error}
        </p>
        <button
          onClick={() => fetchIndexFromDrive(accessToken!)}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: '0.5px solid var(--bg-border)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          {isNotFound ? 'Check again' : 'Retry'}
        </button>
      </div>
    )
  }

  return (
    <motion.div
      data-testid="topic-browser"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <OfflineBanner forceShow={isOffline} />

      <SearchBar onSearch={setQuery} debounceMs={0} />

      {totalDue > 0 && (
        <motion.button
          type="button"
          onClick={() => navigate('/review/all?mode=review')}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '8px',
            border: '0.5px solid var(--accent-muted)',
            backgroundColor: 'var(--accent-muted)',
            color: 'var(--accent)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '48px',
          }}
        >
          Review all due
        </motion.button>
      )}

      <AnimatePresence mode="wait">
        {filteredTopics.length === 0 ? (
          <motion.div
            key="empty"
            data-testid="empty-search-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--text-muted)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
            }}
          >
            No topics match &ldquo;{query}&rdquo;
          </motion.div>
        ) : (
          <motion.div key="grid" style={{ display: 'grid', gap: '12px' }}>
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.slug}
                topic={topic}
                dueCount={dueCountsMap[topic.slug] ?? 0}
                masteryPct={masteryMap[topic.slug] ?? 0}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
