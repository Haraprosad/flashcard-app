import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { StreakData } from '../types'

interface StreakWidgetProps {
  streakData: StreakData
}

function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill={active ? 'var(--accent)' : 'var(--text-muted)'}
      aria-hidden="true"
    >
      <path d="M12 2C12 2 7 7 7 13a5 5 0 0 0 10 0C17 7 12 2 12 2zm0 16a3 3 0 0 1-3-3c0-2.5 2-5 3-6.5 1 1.5 3 4 3 6.5a3 3 0 0 1-3 3z" />
    </svg>
  )
}

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const from = 0

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration])

  return value
}

export function StreakWidget({ streakData }: StreakWidgetProps) {
  const { current, longest } = streakData
  const displayCount = useCountUp(current)
  const isActive = current > 0

  return (
    <motion.div
      data-testid="streak-widget"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '32px 24px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '0.5px solid var(--bg-border)',
      }}
    >
      <FlameIcon active={isActive} />

      {isActive ? (
        <>
          <div
            data-testid="streak-count"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '48px',
              lineHeight: 1,
              color: 'var(--accent)',
            }}
            aria-label={`${current} day streak`}
          >
            {displayCount}
          </div>
          <div style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {current === 1 ? 'day streak' : 'day streak — keep it up!'}
          </div>
          {longest > current && (
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '12px', color: 'var(--text-muted)' }}>
              Best: {longest} days
            </div>
          )}
        </>
      ) : (
        <>
          <div
            data-testid="streak-count"
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '48px',
              lineHeight: 1,
              color: 'var(--text-muted)',
            }}
            aria-label="0 day streak"
          >
            0
          </div>
          <div style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>
            Start your streak today
          </div>
        </>
      )}
    </motion.div>
  )
}
