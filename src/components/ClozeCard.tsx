import { motion } from 'framer-motion'
import { MarkdownText } from './MarkdownText'

interface ClozeCardProps {
  front: string
  back: string
  isFlipped: boolean
}

const blankStyle: React.CSSProperties = {
  display: 'inline',
  borderBottom: '2px solid var(--accent)',
  color: 'var(--accent)',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600,
  padding: '0 8px',
  minWidth: '60px',
}

/**
 * Renders a cloze (fill-in-the-blank) card.
 * Front: shows text with ___ blanks where the hidden segments were.
 * Back: shows full text with the revealed segment highlighted in bold amber.
 *
 * The sync script already expands cloze cards — front has ___ and back has
 * the full revealed text. We just render them appropriately.
 */
export function ClozeCard({ front, back, isFlipped }: ClozeCardProps) {
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
        // Front face — blanks rendered as styled underlines
        <ClozeFront text={front} />
      ) : (
        // Back face — revealed text with highlighted segment
        <ClozeBack text={back} />
      )}
    </div>
  )
}

function ClozeFront({ text }: { text: string }) {
  // Split on ___ to create segments with blanks between them
  const parts = text.split('___')

  return (
    <p
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 'clamp(17px, 3.5vw, 22px)',
        fontWeight: 400,
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {parts.map((part, i) => (
        <span key={i}>
          <MarkdownText text={part} />
          {i < parts.length - 1 && (
            <motion.span
              style={blankStyle}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
              aria-label="blank"
            >
              ___
            </motion.span>
          )}
        </span>
      ))}
    </p>
  )
}

function ClozeBack({ text }: { text: string }) {
  // MarkdownText with boldColor renders **revealed text** in amber,
  // and also handles *italic* and `code` inside the back text.
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
      <MarkdownText text={text} boldColor="var(--accent)" />
    </p>
  )
}
