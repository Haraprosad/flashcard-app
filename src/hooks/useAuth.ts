import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const userEmail = useAuthStore((s) => s.userEmail)
  const isSyncing = useAuthStore((s) => s.isSyncing)
  const signIn = useAuthStore((s) => s.signIn)
  const signInAndSync = useAuthStore((s) => s.signInAndSync)
  const signOut = useAuthStore((s) => s.signOut)
  return {
    accessToken,
    userEmail,
    isSyncing,
    isAuthenticated: accessToken !== null,
    signIn,
    signInAndSync,
    signOut,
  }
}
