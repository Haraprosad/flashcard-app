import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore, type Toast } from '../stores/toastStore'

const TYPE_COLORS = {
  success: { border: 'var(--color-good)', icon: '✓' },
  error:   { border: 'var(--color-again)', icon: '✕' },
  info:    { border: 'var(--bg-border)', icon: 'ℹ' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const { border, icon } = TYPE_COLORS[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '8px',
        border: `0.5px solid ${border}`,
        backgroundColor: 'var(--bg-elevated)',
        minWidth: '220px',
        maxWidth: '320px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: '14px',
          color: border,
          flexShrink: 0,
          fontWeight: 600,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '13px',
          color: 'var(--text-primary)',
          flex: 1,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: '4px',
          lineHeight: 1,
          fontSize: '16px',
          flexShrink: 0,
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
        }}
      >
        ×
      </button>
    </motion.div>
  )
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
