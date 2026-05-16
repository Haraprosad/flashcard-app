import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchBarProps {
  onSearch: (query: string) => void
  debounceMs?: number
}

export function SearchBar({ onSearch, debounceMs = 300 }: SearchBarProps) {
  const [value, setValue] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setValue(next)
      clearTimeout(timerRef.current)
      if (debounceMs === 0) {
        onSearch(next)
      } else {
        timerRef.current = setTimeout(() => onSearch(next), debounceMs)
      }
    },
    [onSearch, debounceMs],
  )

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
  }, [onSearch])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        data-testid="search-input"
        value={value}
        onChange={handleChange}
        placeholder="Search topics..."
        aria-label="Search topics"
        style={{
          width: '100%',
          padding: '12px 40px 12px 16px',
          borderRadius: '8px',
          border: '0.5px solid var(--bg-border)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          outline: 'none',
          minHeight: '48px',
          boxSizing: 'border-box',
        }}
      />
      <AnimatePresence>
        {value.length > 0 && (
          <motion.button
            key="clear"
            type="button"
            onClick={handleClear}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
