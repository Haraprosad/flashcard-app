import { z } from 'zod'
import type { FlashcardsIndex, TopicFile } from '../types'
import { indexedDBService } from './indexedDBService'

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const TopicMetaSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  card_count: z.number().int().nonnegative(),
  source_files: z.array(z.string()),
  generated_at: z.string(),
})

const FlashcardsIndexSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  topics: z.array(TopicMetaSchema),
})

const FlashCardSchema = z.object({
  id: z.string().min(1),
  front: z.string(),
  back: z.string(),
  topic: z.string(),
  tags: z.array(z.string()),
  source_file: z.string(),
  created_at: z.string(),
})

const TopicFileSchema = z.object({
  version: z.string(),
  slug: z.string().min(1),
  title: z.string().min(1),
  generated_at: z.string(),
  cards: z.array(FlashCardSchema),
})

// ─── Drive API helpers ─────────────────────────────────────────────────────

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'

interface DriveFileList {
  files: Array<{ id: string; name: string }>
}

/** Exponential backoff retry wrapper */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 300,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      // Don't retry auth errors
      if (err instanceof Error && err.message === 'Unauthorized') throw err
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt))
      }
    }
  }
  throw lastError
}

async function driveRequest(url: string, token: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized')
    throw new Error(`Drive API error: ${res.status}`)
  }
  return res
}

async function findFolderId(name: string, parentId: string | null, token: string): Promise<string | null> {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  if (parentId) q += ` and '${parentId}' in parents`
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`
  const res = await driveRequest(url, token)
  const data: DriveFileList = await res.json()
  return data.files[0]?.id ?? null
}

async function findFileId(name: string, parentId: string, token: string): Promise<string | null> {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`
  const res = await driveRequest(url, token)
  const data: DriveFileList = await res.json()
  return data.files[0]?.id ?? null
}

async function downloadFileJson<T>(fileId: string, token: string): Promise<T> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`
  const res = await driveRequest(url, token)
  return res.json() as Promise<T>
}

/**
 * Resolve the flashcards folder ID, using IndexedDB cache to avoid
 * repeated folder lookup API calls.
 */
async function getFlashcardsFolderId(token: string): Promise<string> {
  const cached = await indexedDBService.getFolderIds()
  if (cached['flashcards']) return cached['flashcards']

  const parentFolderId = await findFolderId('ObsidianSecondBrain', null, token)
  if (!parentFolderId) throw new Error('Parent folder not found')

  const folderId = await findFolderId('flashcards', parentFolderId, token)
  if (!folderId) throw new Error('Flashcards folder not found')

  await indexedDBService.saveFolderIds({ ...cached, flashcards: folderId })
  return folderId
}

// ─── Public API ────────────────────────────────────────────────────────────

export const gdriveService = {
  async fetchIndex(token: string): Promise<FlashcardsIndex> {
    return withRetry(async () => {
      const folderId = await getFlashcardsFolderId(token)
      const fileId = await findFileId('index.json', folderId, token)
      if (!fileId) throw new Error('index.json not found')

      const raw = await downloadFileJson<unknown>(fileId, token)
      const parsed = FlashcardsIndexSchema.safeParse(raw)
      if (!parsed.success) {
        throw new Error(`index.json schema error: ${parsed.error.message}`)
      }
      return parsed.data as FlashcardsIndex
    })
  },

  async fetchTopicFile(slug: string, token: string): Promise<TopicFile> {
    return withRetry(async () => {
      const folderId = await getFlashcardsFolderId(token)
      const fileId = await findFileId(`${slug}.json`, folderId, token)
      if (!fileId) throw new Error(`${slug}.json not found`)

      const raw = await downloadFileJson<unknown>(fileId, token)
      const parsed = TopicFileSchema.safeParse(raw)
      if (!parsed.success) {
        throw new Error(`${slug}.json schema error: ${parsed.error.message}`)
      }
      return parsed.data as TopicFile
    })
  },
}
