import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTopicStore } from '../stores/topicStore'

export function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const accessToken = useAuthStore((s) => s.accessToken)
  const topic = useTopicStore((s) => (slug ? s.topics[slug] : null))
  const loading = useTopicStore((s) => (slug ? s.loading[slug] : false))
  const error = useTopicStore((s) => (slug ? s.error[slug] : null))
  const fetchTopic = useTopicStore((s) => s.fetchTopic)
  const fetched = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (slug && accessToken && !fetched.current.has(slug)) {
      fetched.current.add(slug)
      fetchTopic(slug, accessToken)
    }
  }, [slug, accessToken, fetchTopic])

  if (!topic && loading) {
    return <div data-testid="topic-detail-loading">Loading...</div>
  }

  if (error && !topic) {
    return (
      <div data-testid="topic-detail-error">
        <p>{error}</p>
        <button onClick={() => slug && accessToken && fetchTopic(slug, accessToken)}>Retry</button>
      </div>
    )
  }

  if (!topic) return null

  return (
    <div data-testid="topic-detail">
      <h1>{topic.title}</h1>
      <p>{topic.cards.length} cards</p>
    </div>
  )
}
