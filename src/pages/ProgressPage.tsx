import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTopicStore } from '../stores/topicStore'
import { progressStore } from '../stores/progressStore'
import { MasteryBar } from '../components/MasteryBar'
import { StreakWidget } from '../components/StreakWidget'
import { ReviewHeatmap } from '../components/ReviewHeatmap'

function StatBox({ label, value, testId }: { label: string; value: number | string; testId: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '16px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '8px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '28px',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export function ProgressPage() {
  const topicFiles = useTopicStore((s) => s.topics)

  const streakData = useMemo(() => progressStore.getStreakData(), [])
  const heatmapData = useMemo(() => progressStore.getHeatmapData(), [])
  const totalReviews = useMemo(() => progressStore.getTotalReviews(), [])

  const topicStatsList = useMemo(
    () =>
      Object.values(topicFiles).map((topic) => ({
        ...progressStore.getTopicStats(topic.slug, topic.cards),
        title: topic.title,
      })),
    [topicFiles],
  )

  const totalCards = useMemo(
    () => Object.values(topicFiles).reduce((sum, t) => sum + t.cards.length, 0),
    [topicFiles],
  )

  return (
    <motion.div
      data-testid="progress-page"
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
        Progress
      </h1>

      <StreakWidget streakData={streakData} />

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '0.5px solid var(--bg-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          Last 90 Days
        </h2>
        <ReviewHeatmap data={heatmapData} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <StatBox label="Total Reviews" value={totalReviews} testId="total-reviews" />
        <StatBox label="Total Cards" value={totalCards} testId="total-cards" />
      </div>

      {topicStatsList.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '0.5px solid var(--bg-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px 12px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Topics
          </div>
          {topicStatsList.map((stats, i) => (
            <div
              key={stats.slug}
              data-testid={`mastery-${stats.slug}`}
              style={{
                padding: '12px 20px',
                borderTop: i === 0 ? 'none' : '0.5px solid var(--bg-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {stats.title}
                </span>
                <span
                  data-testid={`mastery-pct-${stats.slug}`}
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '13px',
                    color: stats.masteryPct >= 80 ? 'var(--color-good)' : 'var(--text-secondary)',
                  }}
                >
                  {Math.round(stats.masteryPct)}%
                </span>
              </div>
              <MasteryBar percentage={stats.masteryPct} slug={stats.slug} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {stats.mastered} mastered
                </span>
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {stats.learning} learning
                </span>
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {stats.newCards} new
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
