import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../stores/reviewStore'

interface SessionCompleteProps {
  reviewedCount: number
  topicSlug: string | null
  driveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'failed'
}

const spring = { type: 'spring', stiffness: 300, damping: 28 }

function DriveSyncBadge({ status }: { status: 'idle' | 'syncing' | 'synced' | 'failed' }) {
  if (status === 'idle') return null

  const config = {
    syncing: { text: 'Saving progress to Drive…', color: 'var(--text-secondary)' },
    synced: { text: 'Progress saved to Drive ✓', color: 'var(--color-good)' },
    failed: { text: 'Saved locally — will sync when online', color: 'var(--text-muted)' },
  }[status]

  return (
    <motion.p
      data-testid="drive-sync-badge"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '13px',
        color: config.color,
        margin: 0,
      }}
    >
      {config.text}
    </motion.p>
  )
}

export function SessionComplete({ reviewedCount, topicSlug, driveSyncStatus = 'idle' }: SessionCompleteProps) {
  const navigate = useNavigate()
  const reset = useReviewStore((s) => s.reset)

  function handleReviewAgain() {
    if (!topicSlug) return
    reset()
    navigate(`/review/${topicSlug}`, { replace: true })
  }

  return (
    <motion.div
      data-testid="session-complete"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        flex: 1,
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '64px',
          lineHeight: 1,
        }}
        role="img"
        aria-label="Celebration"
      >
        🎉
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Session complete!
        </h2>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '17px',
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          You reviewed{' '}
          <span
            data-testid="cards-reviewed-count"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            {reviewedCount}
          </span>{' '}
          card{reviewedCount !== 1 ? 's' : ''}
        </p>
        <DriveSyncBadge status={driveSyncStatus} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <motion.button
          type="button"
          onClick={() => navigate('/topics')}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          aria-label="Back to topics list"
          style={{
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'var(--color-on-accent)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '52px',
          }}
        >
          Back to topics
        </motion.button>

        {topicSlug && (
          <motion.button
            type="button"
            onClick={handleReviewAgain}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            aria-label="Start another review session"
            style={{
              padding: '16px 24px',
              borderRadius: '12px',
              border: '0.5px solid var(--bg-border)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: '52px',
            }}
          >
            Review again
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
