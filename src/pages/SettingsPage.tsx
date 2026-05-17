import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { indexedDBService } from '../services/indexedDBService'
import { srStateService } from '../services/srStateService'
import { progressStore } from '../stores/progressStore'
import { srStateDriveService } from '../services/srStateDriveService'
import { useTopicStore } from '../stores/topicStore'
import { useIndexStore } from '../stores/indexStore'
import { useAuthStore } from '../stores/authStore'
import { vaultSyncService, type SyncProgress } from '../services/vaultSyncService'
import { ConfirmDialog } from '../components/ConfirmDialog'

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'never'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function SectionCard({
  children,
  danger,
}: {
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: danger ? '0.5px solid var(--color-again)' : '0.5px solid var(--bg-border)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '16px 20px 12px',
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        borderBottom: '0.5px solid var(--bg-border)',
      }}
    >
      {label}
    </div>
  )
}

function SettingsRow({
  label,
  sublabel,
  action,
}: {
  label: string
  sublabel?: string
  action: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  loading,
  disabled,
  danger,
  testId,
}: {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  danger?: boolean
  testId?: string
}) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={!disabled && !loading ? { scale: 0.95 } : undefined}
      aria-label={label}
      style={{
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '13px',
        fontWeight: 500,
        color: danger ? 'var(--color-again)' : 'var(--text-secondary)',
        backgroundColor: 'var(--bg-elevated)',
        border: danger ? '0.5px solid var(--color-again)' : '0.5px solid var(--bg-border)',
        borderRadius: '8px',
        padding: '0 14px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        minHeight: '44px',
        whiteSpace: 'nowrap' as const,
        opacity: disabled || loading ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {loading ? 'Working…' : label}
    </motion.button>
  )
}

export function SettingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const fetchIndexFromDrive = useIndexStore((s) => s.fetchIndexFromDrive)

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<{ topicCount: number; cardCount: number } | null>(
    null,
  )
  const [vaultSyncLoading, setVaultSyncLoading] = useState(false)
  const [vaultSyncProgress, setVaultSyncProgress] = useState<SyncProgress | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [cacheLoading, setCacheLoading] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [srSyncedAt, setSrSyncedAt] = useState<string | null>(null)
  const [driveBackupLoading, setDriveBackupLoading] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)

  const loadStats = useCallback(async () => {
    setLastSyncedAt(localStorage.getItem('last_synced_at'))
    const stats = await indexedDBService.getCachedTopicStats()
    setCacheStats(stats)
    const synced = await indexedDBService.getMetaValue<string>('sr_state_synced_at')
    setSrSyncedAt(synced)
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  function showSuccess(msg: string) {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  async function handleVaultSync() {
    if (!accessToken) return
    setVaultSyncLoading(true)
    setVaultSyncProgress(null)
    try {
      await vaultSyncService.syncVault(accessToken, (p) => setVaultSyncProgress(p))
      // Clear IDB cache so the app re-fetches the freshly written JSON
      await indexedDBService.clearTopicCache()
      useTopicStore.setState({ topics: {}, sessionFetchedAt: {} })
      // Reset explored concepts so exploration cards re-appear after a vault sync.
      // The vault sync re-generates all cards from source notes, so concept content
      // may have changed — users should be able to explore them again.
      srStateService.resetExploredConcepts()
      // Push cleared state to Drive so other devices also see exploration cards again
      try {
        const srState = srStateService.getSRState()
        const reviewLog = await indexedDBService.getAllReviewLog()
        const streak = progressStore.getStreakData()
        const payload = await srStateDriveService.buildPayload(srState, [], reviewLog, streak)
        void srStateDriveService.pushSRState(accessToken, payload)
      } catch {
        // Non-fatal — local reset is already done
      }
      // Re-fetch index so Topics page updates immediately
      void fetchIndexFromDrive(accessToken)
      localStorage.setItem('last_synced_at', new Date().toISOString())
      await loadStats()
    } catch (err) {
      setVaultSyncProgress({
        stage: 'done',
        message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setVaultSyncLoading(false)
    }
  }

  async function handleForceResync() {
    setSyncLoading(true)
    try {
      await indexedDBService.clearTopicCache()
      useTopicStore.setState({ topics: {}, sessionFetchedAt: {} })
      showSuccess('Sync cache cleared — topics will re-fetch from Drive')
      await loadStats()
    } finally {
      setSyncLoading(false)
    }
  }

  async function handleClearCache() {
    setCacheLoading(true)
    try {
      await indexedDBService.clearTopicCache()
      useTopicStore.setState({ topics: {}, sessionFetchedAt: {} })
      showSuccess('Card cache cleared')
      await loadStats()
    } finally {
      setCacheLoading(false)
    }
  }

  async function handleResetSRState() {
    await srStateService.resetAllState()
    setResetDialogOpen(false)
    showSuccess('All SR state has been reset')
  }

  async function handleDriveSyncNow() {
    if (!accessToken) return
    setDriveBackupLoading(true)
    try {
      const srState = srStateService.getSRState()
      const explored = srStateService.getExploredConceptIds()
      const reviewLog = await indexedDBService.getAllReviewLog()
      const streak = progressStore.getStreakData()
      const payload = await srStateDriveService.buildPayload(srState, explored, reviewLog, streak)
      await srStateDriveService.pushSRState(accessToken, payload)
      const synced = await indexedDBService.getMetaValue<string>('sr_state_synced_at')
      setSrSyncedAt(synced)
      showSuccess('Progress synced to Drive')
    } catch {
      showSuccess('Sync failed — check your connection')
    } finally {
      setDriveBackupLoading(false)
    }
  }

  async function handleRestoreFromDrive() {
    if (!accessToken) return
    setDriveBackupLoading(true)
    try {
      const remote = await srStateDriveService.fetchSRState(accessToken)
      if (!remote) {
        showSuccess('No Drive backup found')
        return
      }
      await srStateService.bulkSetSRState(remote.sr_state)
      await srStateService.bulkSetExplored(remote.explored_concepts)
      await progressStore.bulkSetData(remote.streak_data, remote.review_log)
      setRestoreDialogOpen(false)
      showSuccess('Progress restored from Drive')
    } catch {
      showSuccess('Restore failed — check your connection')
    } finally {
      setDriveBackupLoading(false)
    }
  }

  async function handleExportSRState() {
    const srState = srStateService.getSRState()
    const explored = srStateService.getExploredConceptIds()
    const reviewLog = await indexedDBService.getAllReviewLog()
    const streak = progressStore.getStreakData()
    const payload = await srStateDriveService.buildPayload(srState, explored, reviewLog, streak)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sr_state.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <motion.div
        data-testid="settings-page"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-base)',
          padding: '24px 16px',
          paddingTop: 'calc(24px + env(safe-area-inset-top))',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '28px',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Settings
        </h1>

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '13px',
              color: 'var(--color-good)',
              backgroundColor: 'var(--bg-elevated)',
              border: '0.5px solid var(--color-good)',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          >
            {successMessage}
          </motion.div>
        )}

        {/* Vault Sync Section */}
        <SectionCard>
          <SectionHeader label="Vault Sync" />
          <SettingsRow
            label="Sync from vault"
            sublabel="Read notes from SecondBrainObsidian and generate flashcard files"
            action={
              <ActionButton
                testId="vault-sync-button"
                label="Sync now"
                onClick={() => void handleVaultSync()}
                loading={vaultSyncLoading}
                disabled={!accessToken}
              />
            }
          />
          {vaultSyncProgress && (
            <div
              style={{
                padding: '0 20px 16px',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '13px',
                color: vaultSyncProgress.message.startsWith('Error')
                  ? 'var(--color-again)'
                  : vaultSyncProgress.stage === 'done'
                    ? 'var(--color-good)'
                    : 'var(--text-secondary)',
              }}
            >
              {vaultSyncProgress.total !== undefined
                ? `${vaultSyncProgress.message} (${vaultSyncProgress.current ?? 0}/${vaultSyncProgress.total})`
                : vaultSyncProgress.message}
            </div>
          )}
        </SectionCard>

        {/* Backup & Sync Section */}
        <SectionCard>
          <SectionHeader label="Backup & Sync" />
          <SettingsRow
            label="Last synced to Drive"
            sublabel={formatTimeAgo(srSyncedAt)}
            action={
              <ActionButton
                testId="drive-sync-now-button"
                label="Sync now"
                onClick={() => void handleDriveSyncNow()}
                loading={driveBackupLoading}
                disabled={!accessToken}
              />
            }
          />
          <SettingsRow
            label="Restore from Drive"
            sublabel="Overwrite local progress with Drive backup"
            action={
              <ActionButton
                testId="restore-from-drive-button"
                label="Restore"
                onClick={() => setRestoreDialogOpen(true)}
                disabled={!accessToken || driveBackupLoading}
              />
            }
          />
          <SettingsRow
            label="Export SR state"
            sublabel="Download sr_state.json to your device"
            action={
              <ActionButton
                testId="export-sr-state-button"
                label="Export"
                onClick={() => void handleExportSRState()}
              />
            }
          />
        </SectionCard>

        {/* Cache Section */}
        <SectionCard>
          <SectionHeader label="Cache" />
          <SettingsRow
            label="Last synced"
            sublabel={formatTimeAgo(lastSyncedAt)}
            action={
              <ActionButton
                testId="force-resync-button"
                label="Force re-fetch"
                onClick={() => void handleForceResync()}
                loading={syncLoading}
              />
            }
          />
          <SettingsRow
            label="Cards cached"
            sublabel={
              cacheStats
                ? `${cacheStats.topicCount} topic${cacheStats.topicCount !== 1 ? 's' : ''}, ${cacheStats.cardCount} card${cacheStats.cardCount !== 1 ? 's' : ''}`
                : 'Loading…'
            }
            action={
              <ActionButton
                testId="clear-cache-button"
                label="Clear card cache"
                onClick={() => void handleClearCache()}
                loading={cacheLoading}
              />
            }
          />
        </SectionCard>

        {/* Reset Section */}
        <SectionCard danger>
          <SectionHeader label="Danger Zone" />
          <SettingsRow
            label="Reset all SR state"
            sublabel="Clears all review history, streaks, and scheduling data"
            action={
              <ActionButton
                testId="reset-sr-state-button"
                label="Reset"
                onClick={() => setResetDialogOpen(true)}
                danger
              />
            }
          />
        </SectionCard>
      </motion.div>

      <ConfirmDialog
        isOpen={resetDialogOpen}
        title="Reset all SR state?"
        description="This will permanently delete all review history, streak data, and scheduling progress. This cannot be undone."
        confirmText="RESET"
        onConfirm={() => void handleResetSRState()}
        onCancel={() => setResetDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={restoreDialogOpen}
        title="Restore from Drive?"
        description="This will replace your local progress with the Drive backup. Your current local history will be lost."
        confirmText="RESTORE"
        onConfirm={() => void handleRestoreFromDrive()}
        onCancel={() => setRestoreDialogOpen(false)}
      />
    </>
  )
}
