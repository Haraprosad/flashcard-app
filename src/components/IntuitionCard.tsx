import { motion } from 'framer-motion'
import { MarkdownText } from './MarkdownText'

interface IntuitionCardProps {
  front: string
  back: string
  isFlipped: boolean
}

/**
 * Renders an intuition (scenario-first) card.
 * Front: scenario text with "Imagine:" prefix in amber, italic body text.
 * Back: revealed explanation in normal body text.
 */
export function IntuitionCard({ front, back, isFlipped }: IntuitionCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        boxSizing: 'border-box',
      }}
    >
      {!isFlipped ? (
        <IntuitionFront text={front} />
      ) : (
        <IntuitionBack text={back} />
      )}
    </div>
  )
}

function IntuitionFront({ text }: { text: string }) {
  // Detect "Imagine:" prefix for special amber styling
  const hasImaginePrefix = /^Imagine[:\s]/i.test(text.trim())

  if (hasImaginePrefix) {
    const withoutPrefix = text.trim().replace(/^Imagine[:\s]+/i, '')
    return (
      <div style={{ textAlign: 'center' }}>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 'clamp(13px, 2.5vw, 15px)',
            fontWeight: 700,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: '0 0 12px 0',
          }}
        >
          Imagine:
        </motion.p>
        <p
          style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 'clamp(18px, 3.5vw, 24px)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          <MarkdownText text={withoutPrefix} />
        </p>
      </div>
    )
  }

  // Generic scenario — render italic DM Serif
  return (
    <p
      style={{
        fontFamily: 'DM Serif Display, serif',
        fontSize: 'clamp(18px, 3.5vw, 24px)',
        fontWeight: 400,
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: 1.5,
        margin: 0,
        fontStyle: 'italic',
      }}
    >
      <MarkdownText text={text} />
    </p>
  )
}

function IntuitionBack({ text }: { text: string }) {
  return (
    <p
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 'clamp(15px, 3vw, 18px)',
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      <MarkdownText text={text} />
    </p>
  )
}
