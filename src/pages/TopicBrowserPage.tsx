import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useIndexStore } from '../stores/indexStore'
import { useTopicStore } from '../stores/topicStore'

export function TopicBrowserPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { index, topics, loading, error, isOffline, fetchIndexFromDrive } = useIndexStore()
  const fetchTopic = useTopicStore((s) => s.fetchTopic)
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

  if (loading || (!index && !error)) {
    return <div data-testid="loading-state">Loading...</div>
  }

  if (error && !topics.length) {
    return (
      <div data-testid="error-state">
        <p>{error}</p>
        <button onClick={() => fetchIndexFromDrive(accessToken!)}>Retry</button>
      </div>
    )
  }

  return (
    <div data-testid="topic-browser">
      {isOffline && <div data-testid="offline-banner">You are offline</div>}
      {topics.map((topic) => (
        <div key={topic.slug} data-testid={`topic-card-${topic.slug}`}>
          <span>{topic.title}</span>
          <span>{topic.card_count} cards</span>
        </div>
      ))}
    </div>
  )
}
