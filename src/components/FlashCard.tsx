import { useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import type { FlashCard } from '../types'
import { ClozeCard } from './ClozeCard'
import { IntuitionCard } from './IntuitionCard'

interface FlashCardProps {
  card: FlashCard
  isFlipped: boolean
  isDraggingEnabled: boolean
  onClick: () => void
  onSwipeRight: () => void
  onSwipeLeft: () => void
  onShortDrag: () => void
}

const SWIPE_THRESHOLD = 80

const TIER_COLORS: Record<number, string> = {
  1: 'var(--color-good)',   // green — intuition
  2: 'var(--accent)',       // amber — mechanism
  3: 'var(--color-easy)',   // blue — formal
}

const TIER_LABELS: Record<number, string> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
}

export function FlashCardComponent({
  card,
  isFlipped,
  isDraggingEnabled,
  onClick,
  onSwipeRight,
  onSwipeLeft,
}: FlashCardProps) {
  const x = useMotionValue(0)
  const dragStartX = useRef(0)
  const hasDragged = useRef(false)

  const overlayOpacityRight = useTransform(x, [0, SWIPE_THRESHOLD * 2], [0, 0.5])
  const overlayOpacityLeft = useTransform(x, [-SWIPE_THRESHOLD * 2, 0], [0.5, 0])
  const rotation = useTransform(x, [-300, 0, 300], [-15, 0, 15])

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    aspectRatio: '3 / 4',
    cursor: isDraggingEnabled ? 'grab' : 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transformStyle: 'preserve-3d',
    WebkitTransformStyle: 'preserve-3d',
  }

  const faceBase: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '20px',
    padding: '32px',
    backgroundColor: card.type === 'intuition' && !isFlipped
      ? 'var(--bg-elevated)'
      : 'var(--bg-surface)',
    border: '0.5px solid var(--bg-border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    overflow: 'hidden',
  }

  return (
    <motion.div
      data-testid="flash-card"
      style={{ ...cardStyle, x, rotateY: isDraggingEnabled ? rotation : 0 }}
      drag={isDraggingEnabled ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragStart={() => {
        dragStartX.current = x.get()
        hasDragged.current = false
      }}
      onDrag={() => {
        hasDragged.current = Math.abs(x.get() - dragStartX.current) > 5
      }}
      onDragEnd={(_, info) => {
        const offset = info.offset.x
        if (offset > SWIPE_THRESHOLD) {
          onSwipeRight()
        } else if (offset < -SWIPE_THRESHOLD) {
          onSwipeLeft()
        } else {
          x.set(0)
        }
      }}
      onClick={() => {
        if (!hasDragged.current) onClick()
      }}
      whileTap={!isDraggingEnabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      data-flipped={isFlipped}
      aria-label={isFlipped ? 'Card back — click to flip' : 'Card front — click to reveal answer'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Tier badge */}
      {card.tier && (
        <div
          data-testid={`tier-badge-${card.tier}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            letterSpacing: '0.05em',
            color: TIER_COLORS[card.tier] ?? 'var(--text-muted)',
            backgroundColor: 'var(--bg-base)',
            border: '0.5px solid var(--bg-border)',
          }}
        >
          {TIER_LABELS[card.tier] ?? 'T1'}
        </div>
      )}

      {/* Front face */}
      <div
        style={{
          ...faceBase,
          transform: 'rotateY(0deg)',
        }}
        aria-hidden={isFlipped}
      >
        {card.type === 'cloze' ? (
          <ClozeCard front={card.front} back={card.back} isFlipped={false} />
        ) : card.type === 'intuition' ? (
          <IntuitionCard front={card.front} back={card.back} isFlipped={false} />
        ) : (
          <p
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(20px, 4vw, 28px)',
              fontWeight: 400,
              color: 'var(--text-primary)',
              textAlign: 'center',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {card.front}
          </p>
        )}
        <span
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          tap to reveal
        </span>
      </div>

      {/* Back face */}
      <div
        style={{
          ...faceBase,
          transform: 'rotateY(180deg)',
          overflowY: 'auto',
          justifyContent: 'flex-start',
          paddingTop: '40px',
        }}
        aria-hidden={!isFlipped}
      >
        {card.type === 'cloze' ? (
          <ClozeCard front={card.front} back={card.back} isFlipped={true} />
        ) : card.type === 'intuition' ? (
          <IntuitionCard front={card.front} back={card.back} isFlipped={true} />
        ) : (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 'clamp(15px, 3vw, 18px)',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              margin: 0,
              width: '100%',
              whiteSpace: 'pre-wrap',
            }}
          >
            {card.back}
          </p>
        )}
        <span
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '20px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {card.source_file}
        </span>
      </div>

      {/* Right swipe overlay (Good) */}
      <motion.div
        data-testid="swipe-right-overlay"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '20px',
          backgroundColor: 'var(--color-good)',
          opacity: overlayOpacityRight,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}
        >
          GOOD
        </span>
      </motion.div>

      {/* Left swipe overlay (Again) */}
      <motion.div
        data-testid="swipe-left-overlay"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '20px',
          backgroundColor: 'var(--color-again)',
          opacity: overlayOpacityLeft,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}
        >
          AGAIN
        </span>
      </motion.div>
    </motion.div>
  )
}
