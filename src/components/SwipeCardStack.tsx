import { motion, AnimatePresence } from 'framer-motion'
import { FlashCardComponent } from './FlashCard'
import { Skeleton } from './Skeleton'
import type { FlashCard, Rating } from '../types'

interface SwipeCardStackProps {
  currentCard: FlashCard | null
  nextCard: FlashCard | null
  isFlipped: boolean
  onFlip: () => void
  onRate: (rating: Rating) => void
  currentIndex: number
  isLoading?: boolean
}

export function SwipeCardStack({
  currentCard,
  nextCard,
  isFlipped,
  onFlip,
  onRate,
  currentIndex,
  isLoading = false,
}: SwipeCardStackProps) {
  if (isLoading) {
    return (
      <div
        data-testid="swipe-card-stack"
        role="status"
        aria-label="Loading card"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          paddingBottom: '24px',
        }}
      >
        {/* Ghost card behind */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '100%',
            maxWidth: '420px',
            aspectRatio: '3 / 4',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-surface)',
            border: '0.5px solid var(--bg-border)',
            transform: 'scale(0.95) translateY(8px)',
            zIndex: 0,
          }}
        />
        {/* Skeleton card */}
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            aspectRatio: '3 / 4',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-surface)',
            border: '0.5px solid var(--bg-border)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 1,
            position: 'relative',
          }}
        >
          <Skeleton height="28px" width="70%" borderRadius="6px" />
          <Skeleton height="20px" width="50%" borderRadius="6px" />
          <Skeleton height="20px" width="40%" borderRadius="6px" />
        </div>
      </div>
    )
  }

  if (!currentCard) return null

  return (
    <div
      data-testid="swipe-card-stack"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingBottom: '24px',
      }}
    >
      {/* Background card (next) */}
      {nextCard && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '100%',
            maxWidth: '420px',
            aspectRatio: '3 / 4',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-surface)',
            border: '0.5px solid var(--bg-border)',
            transform: 'scale(0.95) translateY(8px)',
            zIndex: 0,
          }}
        />
      )}

      {/* Current card (top) */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`card-${currentIndex}`}
          initial={{ scale: 0.95, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={(custom: string) => ({
            x: custom === 'right' ? 500 : custom === 'left' ? -500 : 0,
            rotate: custom === 'right' ? 15 : custom === 'left' ? -15 : 0,
            opacity: 0,
            transition: { duration: 0.3 },
          })}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{ width: '100%', maxWidth: '420px', zIndex: 1, position: 'relative' }}
        >
          <FlashCardComponent
            card={currentCard}
            isFlipped={isFlipped}
            isDraggingEnabled={isFlipped}
            onClick={onFlip}
            onSwipeRight={() => onRate('Good')}
            onSwipeLeft={() => onRate('Again')}
            onShortDrag={() => {}}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
