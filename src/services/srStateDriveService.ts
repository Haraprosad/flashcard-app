import { z } from 'zod'
import type { SRState, CardSRData, StreakData } from '../types'
import { indexedDBService } from './indexedDBService'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
const SR_STATE_FILENAME = 'sr_state.json'

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const CardSRDataSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  last_review: z.string(),
})

const SRStateFileSchema = z.object({
  version: z.string(),
  updated_at: z.string(),
  device_id: z.string(),
  sr_state: z.record(CardSRDataSchema),
  explored_concepts: z.array(z.string()).default([]),
  review_log: z.record(z.number()).default({}),
  streak_data: z.object({
    current: z.number(),
    longest: z.number(),
    last_review_date: z.string().nullable(),
  }).default({ current: 0, longest: 0, last_review_date: null }),
})

export type SRStateFile = z.infer<typeof SRStateFileSchema>

// ─── Drive helpers ────────────────────────────────────────────────────────────

async function driveRequest(url: string, token: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized')
    throw new Error(`Drive API error: ${res.status}`)
  }
  return res
}

async function getFlashcardsFolderId(token: string): Promise<string | null> {
  const cached = await indexedDBService.getFolderIds()
  if (cached['flashcards']) return cached['flashcards']

  // Look for the vault folder first
  const _env = (() => {
    try { return (import.meta.env ?? {}) as Record<string, string> }
    catch { return {} as Record<string, string> }
  })()
  const vaultName = _env.VITE_GDRIVE_FOLDER_NAME ?? 'ObsidianSecondBrain'
  const flashcardsName = _env.VITE_GDRIVE_FLASHCARDS_FOLDER ?? 'flashcards'

  const vaultQ = `name='${vaultName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const vaultRes = await driveRequest(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(vaultQ)}&fields=files(id)&pageSize=1`,
    token,
  )
  const vaultData = (await vaultRes.json()) as { files: { id: string }[] }
  const vaultId = vaultData.files[0]?.id
  if (!vaultId) return null

  const flashQ = `name='${flashcardsName}' and '${vaultId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const flashRes = await driveRequest(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(flashQ)}&fields=files(id)&pageSize=1`,
    token,
  )
  const flashData = (await flashRes.json()) as { files: { id: string }[] }
  return flashData.files[0]?.id ?? null
}

async function findSRStateFileId(folderId: string, token: string): Promise<string | null> {
  const q = `name='${SR_STATE_FILENAME}' and '${folderId}' in parents and trashed=false`
  const res = await driveRequest(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    token,
  )
  const data = (await res.json()) as { files: { id: string }[] }
  return data.files[0]?.id ?? null
}

function buildMultipartBody(metadata: object, content: string): { body: string; boundary: string } {
  const boundary = `boundary_${Date.now()}`
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n')
  return { body, boundary }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const srStateDriveService = {
  /**
   * Download sr_state.json from Drive. Returns null if file not found (first-time user).
   */
  async fetchSRState(token: string): Promise<SRStateFile | null> {
    try {
      const folderId = await getFlashcardsFolderId(token)
      if (!folderId) return null

      const fileId = await findSRStateFileId(folderId, token)
      if (!fileId) return null

      const res = await driveRequest(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, token)
      const raw = await res.json()
      return SRStateFileSchema.parse(raw)
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') throw err
      return null
    }
  },

  /**
   * Write sr_state.json to Drive (create or update). On network failure, sets pending flag.
   */
  async pushSRState(token: string, payload: SRStateFile): Promise<void> {
    try {
      const folderId = await getFlashcardsFolderId(token)
      if (!folderId) throw new Error('Flashcards folder not found in Drive')

      const fileId = await findSRStateFileId(folderId, token)
      const content = JSON.stringify(payload, null, 2)

      if (fileId) {
        // PATCH existing file
        const { body, boundary } = buildMultipartBody({}, content)
        await driveRequest(`${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=multipart`, token, {
          method: 'PATCH',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        })
      } else {
        // POST new file
        const metadata = { name: SR_STATE_FILENAME, parents: [folderId] }
        const { body, boundary } = buildMultipartBody(metadata, content)
        await driveRequest(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, token, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        })
      }

      await indexedDBService.setMetaValue('sr_state_synced_at', new Date().toISOString())
      await indexedDBService.deleteMetaValue('sr_state_pending_upload')
    } catch (err) {
      if (err instanceof TypeError || (err instanceof Error && err.message !== 'Unauthorized')) {
        // Network failure — queue for later
        await indexedDBService.setMetaValue('sr_state_pending_upload', true)
      }
      throw err
    }
  },

  /**
   * Merge two SRState maps: pick the entry with higher reps; tie-break by most recent last_review.
   * Never deletes cards — always returns the union of all keys.
   */
  mergeSRState(local: SRState, remote: SRState): SRState {
    const merged: SRState = {}
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)])
    for (const cardId of allKeys) {
      const l = local[cardId]
      const r = remote[cardId]
      if (!l) { merged[cardId] = r!; continue }
      if (!r) { merged[cardId] = l; continue }
      if (l.reps !== r.reps) {
        merged[cardId] = l.reps > r.reps ? l : r
      } else {
        // Tie-break: most recent last_review
        merged[cardId] = l.last_review >= r.last_review ? l : r
      }
    }
    return merged
  },

  /**
   * Merge explored concept arrays (union).
   */
  mergeExploredConcepts(local: string[], remote: string[]): string[] {
    return Array.from(new Set([...local, ...remote]))
  },

  /**
   * Merge review logs (sum counts per day).
   */
  mergeReviewLog(
    local: Record<string, number>,
    remote: Record<string, number>,
  ): Record<string, number> {
    const merged: Record<string, number> = { ...remote }
    for (const [date, count] of Object.entries(local)) {
      merged[date] = Math.max(merged[date] ?? 0, count)
    }
    return merged
  },

  /**
   * Merge streak data: keep the one with the higher longest streak; prefer higher current.
   */
  mergeStreakData(local: SRStateFile['streak_data'], remote: SRStateFile['streak_data']): SRStateFile['streak_data'] {
    return {
      longest: Math.max(local.longest, remote.longest),
      current: Math.max(local.current, remote.current),
      last_review_date: local.last_review_date && remote.last_review_date
        ? local.last_review_date >= remote.last_review_date
          ? local.last_review_date
          : remote.last_review_date
        : local.last_review_date ?? remote.last_review_date,
    }
  },

  /**
   * Build the SRStateFile payload from local in-memory data.
   */
  async buildPayload(
    srState: SRState,
    explored: string[],
    reviewLog: Record<string, number>,
    streakData: SRStateFile['streak_data'],
  ): Promise<SRStateFile> {
    const deviceId = await indexedDBService.getDeviceId()
    return {
      version: '1.0',
      updated_at: new Date().toISOString(),
      device_id: deviceId,
      sr_state: srState,
      explored_concepts: explored,
      review_log: reviewLog,
      streak_data: streakData,
    }
  },
}
