import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const userEmail = useAuthStore((s) => s.userEmail)
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)
  return {
    accessToken,
    userEmail,
    isAuthenticated: accessToken !== null,
    signIn,
    signOut,
  }
}
