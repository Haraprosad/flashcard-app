import { useEffect } from 'react'
import { AppRouter } from './router'
import { AuthErrorBoundary } from './components/AuthErrorBoundary'
import { srStateService } from './services/srStateService'
import { progressStore } from './stores/progressStore'

function App() {
  // Pre-load SR state and progress data from IDB into memory caches on mount
  useEffect(() => {
    void Promise.all([srStateService.init(), progressStore.init()])
  }, [])

  return (
    <AuthErrorBoundary>
      <AppRouter />
    </AuthErrorBoundary>
  )
}

export default App
