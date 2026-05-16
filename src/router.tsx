import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { LoginPage } from './pages/LoginPage'
import { TopicBrowserPage } from './pages/TopicBrowserPage'
import { TopicDetailPage } from './pages/TopicDetailPage'
import { ReviewSessionPage } from './pages/ReviewSessionPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { BottomNav } from './components/BottomNav'
import { Toaster } from './components/Toaster'
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

function LoginRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/topics" replace />
  return <LoginPage />
}

// Layout for main app tabs: auth-gated, shows BottomNav + Toaster + page transitions
function AppLayout() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <>
      <div style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
      <Toaster />
    </>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      {/* Main tab routes — protected, with BottomNav + page transitions */}
      <Route element={<AppLayout />}>
        <Route path="/topics" element={<TopicBrowserPage />} />
        <Route path="/topics/:slug" element={<TopicDetailPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Full-screen routes — no BottomNav */}
      <Route
        path="/review/:slug"
        element={
          <ProtectedRoute>
            <ReviewSessionPage />
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
