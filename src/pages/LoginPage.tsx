import { motion } from 'framer-motion'
import { GoogleSignInButton } from '../components/GoogleSignInButton'

export function LoginPage() {
  return (
    <motion.div
      data-testid="login-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h1
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: '2.5rem',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Flashcards
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            Your Obsidian notes, as flashcards
          </p>
        </div>

        <GoogleSignInButton />
      </div>
    </motion.div>
  )
}
