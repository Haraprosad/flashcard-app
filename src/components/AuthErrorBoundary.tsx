import { Component } from 'react'
import type { ReactNode } from 'react'
import { useAuthStore } from '../stores/authStore'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
      useAuthStore.getState().signOut()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-secondary)',
            fontFamily: 'DM Sans, sans-serif',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '15px' }}>
            An authentication error occurred. Please sign in again.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false })
              useAuthStore.getState().signOut()
              window.location.href = '/login'
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '0.5px solid var(--bg-border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Back to login
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
