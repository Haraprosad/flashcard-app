import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':        'var(--bg-base)',
        'bg-surface':     'var(--bg-surface)',
        'bg-elevated':    'var(--bg-elevated)',
        'bg-border':      'var(--bg-border)',
        'accent':         'var(--accent)',
        'accent-muted':   'var(--accent-muted)',
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'color-again':    'var(--color-again)',
        'color-hard':     'var(--color-hard)',
        'color-good':     'var(--color-good)',
        'color-easy':     'var(--color-easy)',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans:  ['"DM Sans"', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card:  '12px',
        btn:   '8px',
        badge: '6px',
        sheet: '20px',
      },
    },
  },
  plugins: [],
}

export default config
