import { useAuthStore } from '../stores/authStore'

export async function refreshTokenSilently(): Promise<boolean> {
  try {
    // Silent re-auth would use Google's token refresh mechanism.
    // Without an active Google Identity Services session, this always fails —
    // which is the correct behaviour for the first implementation.
    return false
  } catch {
    useAuthStore.getState().signOut()
    return false
  }
}

export function clearAuthState(): void {
  useAuthStore.getState().signOut()
}
