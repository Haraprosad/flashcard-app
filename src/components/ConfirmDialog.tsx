import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setInputValue('')
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const isMatch = inputValue === confirmText

  function handleConfirm() {
    if (!isMatch) return
    onConfirm()
    setInputValue('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '24px',
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            data-testid="confirm-dialog"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '0.5px solid var(--bg-border)',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              id="confirm-dialog-title"
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: '20px',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {title}
            </h2>

            <p
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor="confirm-dialog-input"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}
              >
                Type{' '}
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {confirmText}
                </strong>{' '}
                to confirm
              </label>
              <input
                ref={inputRef}
                id="confirm-dialog-input"
                data-testid="confirm-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancel()
                  if (e.key === 'Enter') handleConfirm()
                }}
                autoComplete="off"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '0.5px solid var(--bg-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '10px 12px',
                  outline: 'none',
                  minHeight: '44px',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: '0.5px solid var(--bg-border)',
                  borderRadius: '8px',
                  padding: '0 16px',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '80px',
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                data-testid="confirm-button"
                onClick={handleConfirm}
                disabled={!isMatch}
                aria-label={
                  isMatch ? 'Confirm action' : `Type ${confirmText} to enable confirm button`
                }
                whileTap={isMatch ? { scale: 0.95 } : undefined}
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isMatch ? 'var(--text-primary)' : 'var(--text-muted)',
                  backgroundColor: isMatch ? 'var(--color-again)' : 'var(--bg-elevated)',
                  border: '0.5px solid var(--bg-border)',
                  borderRadius: '8px',
                  padding: '0 16px',
                  cursor: isMatch ? 'pointer' : 'not-allowed',
                  minHeight: '44px',
                  minWidth: '80px',
                  transition: 'background-color 0.2s, color 0.2s',
                }}
              >
                Confirm
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
