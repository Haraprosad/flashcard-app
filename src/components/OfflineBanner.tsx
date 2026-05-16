import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOfflineStatus } from '../hooks/useOfflineStatus'

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'unknown'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

interface OfflineBannerProps {
  /** Show banner even when hook says online — used when indexStore.isOffline is true */
  forceShow?: boolean
}

export function OfflineBanner({ forceShow = false }: OfflineBannerProps) {
  const { isOnline } = useOfflineStatus()
  const [dismissed, setDismissed] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    setLastSyncedAt(localStorage.getItem('last_synced_at'))
  }, [])

  useEffect(() => {
    if (!isOnline || forceShow) setDismissed(false)
  }, [isOnline, forceShow])

  const visible = (!isOnline || forceShow) && !dismissed

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="offline-banner"
          role="alert"
          aria-live="polite"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            border: '0.5px solid var(--bg-border)',
            gap: '8px',
          }}
        >
          <span>
            You are offline · Last synced {formatTimeAgo(lastSyncedAt)}
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss offline banner"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '4px',
              fontSize: '20px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
