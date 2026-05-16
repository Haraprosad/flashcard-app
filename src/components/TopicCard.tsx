import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MasteryBar } from './MasteryBar'
import type { TopicMeta } from '../types'

interface TopicCardProps {
  topic: TopicMeta
  dueCount: number
  masteryPct: number
}

export function TopicCard({ topic, dueCount, masteryPct }: TopicCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/topics/${topic.slug}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <motion.div
      data-testid={`topic-card-${topic.slug}`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${topic.title}, ${topic.card_count} cards${dueCount > 0 ? `, ${dueCount} due` : ''}`}
      whileHover={{ scale: 1.02, borderColor: 'var(--text-muted)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        padding: '20px',
        borderRadius: '12px',
        border: '0.5px solid var(--bg-border)',
        backgroundColor: 'var(--bg-surface)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '48px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: '18px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
            }}
          >
            {topic.title}
          </span>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            {topic.card_count} cards
          </span>
        </div>
        {dueCount > 0 && (
          <span
            data-testid={`due-badge-${topic.slug}`}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-muted)',
              padding: '4px 8px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            {dueCount} due
          </span>
        )}
      </div>
      <MasteryBar percentage={masteryPct} slug={topic.slug} />
    </motion.div>
  )
}
