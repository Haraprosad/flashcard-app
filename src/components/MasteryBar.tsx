interface MasteryBarProps {
  percentage: number
  slug: string
}

export function MasteryBar({ percentage, slug }: MasteryBarProps) {
  const isMastered = percentage >= 80
  const fillColor = isMastered ? 'var(--color-good)' : 'var(--accent)'

  return (
    <div
      data-testid={`mastery-bar-${slug}`}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Mastery: ${Math.round(percentage)}%`}
      style={{
        width: '100%',
        height: '3px',
        backgroundColor: 'var(--bg-border)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <div
        data-testid={`mastery-fill-${slug}`}
        style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: fillColor,
          borderRadius: '2px',
          transition: 'width 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      />
    </div>
  )
}
