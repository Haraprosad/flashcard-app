import { motion } from 'framer-motion'
import { getHeatmapLevel } from '../stores/progressStore'
import type { ReviewLogEntry } from '../types'

interface ReviewHeatmapProps {
  data: ReviewLogEntry[]
}

const LEVEL_COLORS = [
  'var(--bg-elevated)',
  'var(--heatmap-1)',
  'var(--heatmap-2)',
  'var(--heatmap-3)',
]

const LEVEL_LABELS = ['No reviews', '1–4 reviews', '5–9 reviews', '10+ reviews']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function ReviewHeatmap({ data }: ReviewHeatmapProps) {
  const today = todayStr()

  return (
    <div data-testid="review-heatmap" aria-label="Review activity heatmap">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px',
        }}
        role="grid"
        aria-label="90-day review heatmap"
      >
        {data.map((entry, index) => {
          const level = getHeatmapLevel(entry.count)
          const isToday = entry.date === today
          return (
            <motion.div
              key={entry.date}
              data-testid="heatmap-cell"
              data-date={entry.date}
              data-count={entry.count}
              data-level={level}
              role="gridcell"
              aria-label={`${entry.date}: ${entry.count} review${entry.count !== 1 ? 's' : ''}`}
              title={`${entry.date}: ${entry.count} review${entry.count !== 1 ? 's' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.002 }}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: LEVEL_COLORS[level],
                outline: isToday ? '1.5px solid var(--accent)' : undefined,
                outlineOffset: isToday ? '1px' : undefined,
                flexShrink: 0,
              }}
            />
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '8px',
        }}
        aria-hidden="true"
      >
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '10px', color: 'var(--text-muted)' }}>
          Less
        </span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            title={LEVEL_LABELS[i]}
            style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: color }}
          />
        ))}
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '10px', color: 'var(--text-muted)' }}>
          More
        </span>
      </div>
    </div>
  )
}
