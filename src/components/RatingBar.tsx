import { motion, AnimatePresence } from 'framer-motion'
import type { FlashCard, CardSRData, Rating } from '../types'
import { fsrsService } from '../services/fsrsService'
import { srStateService } from '../services/srStateService'

interface RatingBarProps {
  card: FlashCard
  isVisible: boolean
  onRate: (rating: Rating) => void
}

const ratingConfig: { rating: Rating; label: string; color: string; key: string }[] = [
  { rating: 'Again', label: 'Again', color: 'var(--color-again)', key: '1' },
  { rating: 'Hard', label: 'Hard', color: 'var(--color-hard)', key: '2' },
  { rating: 'Good', label: 'Good', color: 'var(--color-good)', key: '3' },
  { rating: 'Easy', label: 'Easy', color: 'var(--color-easy)', key: '4' },
]

export function RatingBar({ card, isVisible, onRate }: RatingBarProps) {
  const srData: CardSRData | null = srStateService.getCardSRData(card.id)
  const intervals = fsrsService.getNextIntervals(card, srData)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="rating-bar"
          role="group"
          aria-label="Rate this card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            width: '100%',
            maxWidth: '420px',
          }}
        >
          {ratingConfig.map(({ rating, label, color, key }, i) => (
            <motion.button
              key={rating}
              type="button"
              data-testid={`rate-${rating.toLowerCase()}`}
              onClick={() => onRate(rating)}
              aria-label={`Rate as ${label} — next review in ${intervals[rating]} (key: ${key})`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 28 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '14px 8px',
                borderRadius: '12px',
                border: `1px solid ${color}33`,
                backgroundColor: `${color}15`,
                color: 'var(--text-primary)',
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                minHeight: '64px',
                minWidth: '44px',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color,
                }}
              >
                {label}
              </span>
              <span
                data-testid={`interval-${rating.toLowerCase()}`}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                }}
              >
                {intervals[rating]}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
