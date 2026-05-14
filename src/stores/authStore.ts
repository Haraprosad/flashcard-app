import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  userEmail: string | null
  signIn: (token: string, email: string) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userEmail: null,
  signIn: (token: string, email: string) => set({ accessToken: token, userEmail: email }),
  signOut: () => set({ accessToken: null, userEmail: null }),
}))
