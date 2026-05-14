import { AppRouter } from './router'
import { AuthErrorBoundary } from './components/AuthErrorBoundary'

function App() {
  return (
    <AuthErrorBoundary>
      <AppRouter />
    </AuthErrorBoundary>
  )
}

export default App
