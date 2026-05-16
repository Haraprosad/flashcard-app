import { useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useTopicStore } from '../stores/topicStore'
import { useReviewStore } from '../stores/reviewStore'
import { SwipeCardStack } from '../components/SwipeCardStack'
import { RatingBar } from '../components/RatingBar'
import { SessionComplete } from '../components/SessionComplete'
import type { Rating } from '../types'

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function ReviewSessionPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const fetchTopic = useTopicStore((s) => s.fetchTopic)
  const getAllCachedCards = useTopicStore((s) => s.getAllCachedCards)
  const getCardsByTopic = useTopicStore((s) => s.getCardsByTopic)

  const topicLoading = useTopicStore((s) => (slug && slug !== 'all' ? !!s.loading[slug] : false))

  const queue = useReviewStore((s) => s.queue)
  const currentIndex = useReviewStore((s) => s.currentIndex)
  const isFlipped = useReviewStore((s) => s.isFlipped)
  const reviewedCount = useReviewStore((s) => s.reviewedCount)
  const isComplete = useReviewStore((s) => s.isComplete)
  const topicSlug = useReviewStore((s) => s.topicSlug)
  const loadSession = useReviewStore((s) => s.loadSession)
  const flip = useReviewStore((s) => s.flip)
  const rate = useReviewStore((s) => s.rate)

  const currentCard = queue[currentIndex] ?? null
  const nextCard = queue[currentIndex + 1] ?? null

  // Load cards and start session
  useEffect(() => {
    async function init() {
      if (!slug || !accessToken) return

      if (slug === 'all') {
        const cachedCards = getAllCachedCards()
        loadSession('all', cachedCards)
      } else {
        const topic = await fetchTopic(slug, accessToken)
        const cards = topic?.cards ?? getCardsByTopic(slug)
        loadSession(slug, cards)
      }
    }
    init()
  }, [slug, accessToken, fetchTopic, getAllCachedCards, getCardsByTopic, loadSession])

  const handleRate = useCallback(
    (rating: Rating) => {
      rate(rating)
    },
    [rate],
  )

  const handleFlip = useCallback(() => {
    flip()
  }, [flip])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isComplete) return

      if (!isFlipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          flip()
        }
      } else {
        switch (e.key) {
          case '1':
            handleRate('Again')
            break
          case '2':
            handleRate('Hard')
            break
          case '3':
            handleRate('Good')
            break
          case '4':
            handleRate('Easy')
            break
          case 'ArrowLeft':
            handleRate('Again')
            break
          case 'ArrowRight':
            handleRate('Good')
            break
          case ' ':
          case 'Enter':
            e.preventDefault()
            break
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFlipped, isComplete, flip, handleRate])

  const isSessionLoading = topicLoading || (queue.length === 0 && !isComplete)
  const totalInSession = queue.length > 0 ? Math.max(queue.length, reviewedCount) : 0
  const progress = totalInSession > 0 ? reviewedCount / totalInSession : 0

  const titleLabel = slug === 'all' ? 'All Topics' : (queue[0]?.topic ?? slug ?? '')

  return (
    <div
      data-testid="review-session-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-base)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '8px 16px',
          paddingTop: 'calc(8px + env(safe-area-inset-top))',
        }}
      >
        <motion.button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Exit review session"
          whileTap={{ scale: 0.9 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <XIcon />
        </motion.button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--text-muted)',
              textTransform: 'capitalize',
            }}
          >
            {titleLabel}
          </span>
          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={reviewedCount}
            aria-valuemax={totalInSession}
            aria-label={`${reviewedCount} of ${totalInSession} cards reviewed`}
            style={{
              height: '3px',
              borderRadius: '2px',
              backgroundColor: 'var(--bg-elevated)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                backgroundColor: 'var(--accent)',
                borderRadius: '2px',
                width: `${progress * 100}%`,
              }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
        </div>

        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          {reviewedCount}/{totalInSession}
        </span>
      </div>

      {/* Main content */}
      {isComplete ? (
        <SessionComplete reviewedCount={reviewedCount} topicSlug={topicSlug} />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '16px 16px 32px',
          }}
        >
          <SwipeCardStack
            currentCard={currentCard}
            nextCard={nextCard}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onRate={handleRate}
            currentIndex={currentIndex}
            isLoading={isSessionLoading}
          />

          {currentCard && (
            <RatingBar
              card={currentCard}
              isVisible={isFlipped}
              onRate={handleRate}
            />
          )}

          {!isFlipped && currentCard && (
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--text-muted)',
                margin: 0,
              }}
              aria-live="polite"
            >
              Tap the card or press Space to reveal
            </p>
          )}
        </div>
      )}
    </div>
  )
}
