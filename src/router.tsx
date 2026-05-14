import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoginPage } from './pages/LoginPage'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/topics' : '/login'} replace />
}

// Placeholder — replaced in Phase 3
function TopicBrowserPlaceholder() {
  return <div data-testid="topic-browser" />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/topics"
        element={
          <ProtectedRoute>
            <TopicBrowserPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
