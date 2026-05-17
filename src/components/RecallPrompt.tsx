import { motion } from 'framer-motion'

interface RecallPromptProps {
  topicTitle: string
  onContinue: () => void
}

/**
 * Pre-session recall prompt — shown once per topic per session before the first
 * flashcard renders. Implements the Roediger & Karpicke (2006) retrieval-practice
 * effect: attempting recall before exposure strengthens encoding even when
 * the attempt is incorrect.
 *
 * NOT shown for:
 * - /review/all sessions (topic label is ambiguous)
 * - Single-card sessions
 * - Re-queue sessions (mode === 'fresh')
 */
export function RecallPrompt({ topicTitle, onContinue }: RecallPromptProps) {
  return (
    <motion.div
      data-testid="recall-prompt"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '32px 24px',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Brain icon */}
      <div
        aria-hidden="true"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}
      >
        🧠
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 'clamp(22px, 5vw, 28px)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          Before we start — what do you already know about{' '}
          <span style={{ color: 'var(--accent)' }}>{topicTitle}</span>?
        </h2>

        <p
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '15px',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Take 30 seconds to think. No input needed — just think.
        </p>
      </div>

      <motion.button
        data-testid="recall-continue"
        type="button"
        onClick={onContinue}
        whileTap={{ scale: 0.97 }}
        style={{
          padding: '14px 32px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'var(--accent)',
          color: '#000',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '44px',
          marginTop: '8px',
        }}
      >
        I&apos;ve thought about it → Continue
      </motion.button>
    </motion.div>
  )
}
