interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-border) 50%, var(--bg-elevated) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
