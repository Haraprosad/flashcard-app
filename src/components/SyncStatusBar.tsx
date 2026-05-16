import { motion } from 'framer-motion'

interface SyncStatusBarProps {
  lastSyncedAt: string | null
  isSyncing: boolean
  onSync: () => void
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SyncStatusBar({ lastSyncedAt, isSyncing, onSync }: SyncStatusBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}
      >
        {lastSyncedAt ? `Last synced ${formatTimeAgo(lastSyncedAt)}` : 'Not synced yet'}
      </span>
      <motion.button
        type="button"
        onClick={onSync}
        disabled={isSyncing}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        aria-label="Sync now"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '0.5px solid var(--bg-border)',
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          opacity: isSyncing ? 0.6 : 1,
          minHeight: '36px',
        }}
      >
        {isSyncing ? (
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid var(--text-muted)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z"
              fill="currentColor"
            />
          </svg>
        )}
        {isSyncing ? 'Syncing...' : 'Sync'}
      </motion.button>
    </div>
  )
}
