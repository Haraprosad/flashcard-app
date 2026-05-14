import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/.agents/**', '**/dist/**', '**/e2e/**'],
  },
})
