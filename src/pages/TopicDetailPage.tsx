import { useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useTopicStore } from '../stores/topicStore'
import { srStateService } from '../services/srStateService'

const spring = { type: 'spring', stiffness: 400, damping: 30 }

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''}`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''}`
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 13L5 8L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M7 13L11 9L7 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

function NewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LearningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 14L8 10L11 13L16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10C3 6.13 6.13 3 10 3C12.5 3 14.7 4.26 16 6.18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 10C17 13.87 13.87 17 10 17C7.5 17 5.3 15.74 4 13.82" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.5 4.5L16 6.18L17.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MasteredIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10L9 12.5L13.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface StatChipProps {
  label: string
  count: number
  color: string
  icon: React.ReactNode
}

function StatChip({ label, count, color, icon }: StatChipProps) {
  return (
    <div
      aria-label={`${count} ${label.toLowerCase()} card${count !== 1 ? 's' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '16px 8px',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-surface)',
        border: '0.5px solid var(--bg-border)',
      }}
    >
      <div style={{ color }}>{icon}</div>
      <span
        style={{
          fontFamily: 'DM Serif Display, serif',
          fontSize: '24px',
          fontWeight: 400,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
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

  const stats = useMemo(() => {
    if (!topic) return null
    const srState = srStateService.getSRState()
    const now = new Date()

    let newCount = 0
    let learningCount = 0
    let reviewCount = 0
    let masteredCount = 0
    let nextDue: Date | null = null

    for (const card of topic.cards) {
      const data = srState[card.id]
      if (!data || data.state === 0) {
        newCount++
      } else if (data.state === 1 || data.state === 3) {
        learningCount++
        const dueDate = new Date(data.due)
        if (dueDate > now && (!nextDue || dueDate < nextDue)) {
          nextDue = dueDate
        }
      } else if (data.state === 2) {
        if (data.reps >= 3) {
          masteredCount++
        } else {
          reviewCount++
        }
        const dueDate = new Date(data.due)
        if (dueDate > now && (!nextDue || dueDate < nextDue)) {
          nextDue = dueDate
        }
      }
    }

    const cardIds = topic.cards.map((c) => c.id)
    const dueToday = srStateService.getDueCardIds(cardIds).length

    return { newCount, learningCount, reviewCount, masteredCount, dueToday, nextDue }
  }, [topic])

  const nextReviewLabel = useMemo(() => {
    if (!stats?.nextDue) return null
    const diffMs = stats.nextDue.getTime() - Date.now()
    if (diffMs <= 0) return null
    return `Next card due in ${formatDuration(diffMs)}`
  }, [stats])

  const sourceFiles = useMemo(() => {
    if (!topic) return []
    return Array.from(new Set(topic.cards.map((c) => c.source_file))).filter(Boolean)
  }, [topic])

  if (!topic && loading) {
    return (
      <div
        data-testid="topic-detail-loading"
        role="status"
        aria-label="Loading topic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <style>{`
          @keyframes td-spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) {
            .td-spinner { animation: none !important; border-top-color: var(--accent) !important; }
          }
        `}</style>
        <div
          className="td-spinner"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid var(--bg-border)',
            borderTopColor: 'var(--accent)',
            animation: 'td-spin 0.8s linear infinite',
          }}
        />
      </div>
    )
  }

  if (error && !topic) {
    const isOfflineError = error === "This topic hasn't been downloaded yet"
    return (
      <div
        data-testid="topic-detail-error"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '100dvh',
          padding: '24px',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {error}
        </p>
        {isOfflineError && (
          <p
            data-testid="sync-when-online"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Sync when online
          </p>
        )}
        {!isOfflineError && (
          <button
            onClick={() => slug && accessToken && fetchTopic(slug, accessToken)}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              border: '0.5px solid var(--bg-border)',
              color: 'var(--text-primary)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!topic) return null

  const reviewButtonLabel = stats?.dueToday
    ? `Review ${stats.dueToday} due card${stats.dueToday !== 1 ? 's' : ''}`
    : 'Start Review'

  return (
    <motion.div
      data-testid="topic-detail"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-base)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Top nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 8px',
          paddingTop: 'calc(8px + env(safe-area-inset-top))',
        }}
      >
        <motion.button
          type="button"
          onClick={() => navigate('/topics')}
          whileTap={{ scale: 0.92 }}
          transition={spring}
          aria-label="Back to topics"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            cursor: 'pointer',
            minHeight: '44px',
            minWidth: '44px',
          }}
        >
          <ChevronLeft />
          Back
        </motion.button>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          padding: '8px 24px 40px',
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Topic header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h1
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: '32px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {topic.title}
          </h1>
          {sourceFiles.length > 0 && (
            <div
              aria-label="Source files"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
            >
              {sourceFiles.map((file) => (
                <span
                  key={file}
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-elevated)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '0.5px solid var(--bg-border)',
                  }}
                >
                  {file}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div
            role="region"
            aria-label="Card statistics"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            <StatChip label="New" count={stats.newCount} color="var(--color-easy)" icon={<NewIcon />} />
            <StatChip label="Learning" count={stats.learningCount} color="var(--color-hard)" icon={<LearningIcon />} />
            <StatChip label="Review" count={stats.reviewCount} color="var(--accent)" icon={<ReviewIcon />} />
            <StatChip label="Mastered" count={stats.masteredCount} color="var(--color-good)" icon={<MasteredIcon />} />
          </div>
        )}

        {/* Next review label */}
        {nextReviewLabel && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ClockIcon />
            {nextReviewLabel}
          </p>
        )}

        {/* Start review button */}
        <motion.button
          type="button"
          onClick={() => navigate(`/review/${slug}`)}
          whileTap={{ scale: 0.96 }}
          transition={spring}
          aria-label={`${reviewButtonLabel} for ${topic.title}`}
          style={{
            width: '100%',
            padding: '18px 24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'var(--color-on-accent)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '17px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '-0.01em',
          }}
        >
          {reviewButtonLabel}
          <ChevronRight />
        </motion.button>

        {/* Card count */}
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {topic.cards.length} card{topic.cards.length !== 1 ? 's' : ''} total
        </p>
      </div>
    </motion.div>
  )
}
