import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { srStateDriveService } from '../services/srStateDriveService'
import { srStateService } from '../services/srStateService'
import { progressStore } from './progressStore'
import { indexedDBService } from '../services/indexedDBService'

interface AuthState {
  accessToken: string | null
  userEmail: string | null
  isSyncing: boolean
  signIn: (token: string, email: string) => void
  signInAndSync: (token: string, email: string) => Promise<void>
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userEmail: null,
      isSyncing: false,

      signIn: (token: string, email: string) => set({ accessToken: token, userEmail: email }),

      signInAndSync: async (token: string, email: string) => {
        set({ accessToken: token, userEmail: email, isSyncing: true })
        try {
          // Ensure local caches are loaded first
          await Promise.all([srStateService.init(), progressStore.init()])

          const remote = await srStateDriveService.fetchSRState(token)
          if (remote) {
            // Merge SR state
            const localSR = srStateService.getSRState()
            const mergedSR = srStateDriveService.mergeSRState(localSR, remote.sr_state)
            await srStateService.bulkSetSRState(mergedSR)

            // Merge explored concepts
            const localExplored = srStateService.getExploredConceptIds()
            const mergedExplored = srStateDriveService.mergeExploredConcepts(
              localExplored,
              remote.explored_concepts,
            )
            await srStateService.bulkSetExplored(mergedExplored)

            // Merge review log and streak
            const localLog = progressStore.getHeatmapData().reduce(
              (acc, e) => { if (e.count > 0) acc[e.date] = e.count; return acc },
              {} as Record<string, number>,
            )
            const mergedLog = srStateDriveService.mergeReviewLog(localLog, remote.review_log)
            const localStreak = progressStore.getStreakData()
            const mergedStreak = srStateDriveService.mergeStreakData(localStreak, remote.streak_data)
            await progressStore.bulkSetData(mergedStreak, mergedLog)

            // If we had a pending upload, push now that we have Drive access
            const pending = await indexedDBService.getMetaValue<boolean>('sr_state_pending_upload')
            if (pending) {
              const payload = await srStateDriveService.buildPayload(
                mergedSR,
                mergedExplored,
                mergedLog,
                mergedStreak,
              )
              void srStateDriveService.pushSRState(token, payload).catch(() => { /* silent */ })
            }
          }
        } catch {
          // Never block login — continue with local state
        } finally {
          set({ isSyncing: false })
        }
      },

      signOut: () => set({ accessToken: null, userEmail: null, isSyncing: false }),
    }),
    {
      name: 'flashcard-auth',
      partialize: (state) => ({ accessToken: state.accessToken, userEmail: state.userEmail }),
    },
  ),
)
