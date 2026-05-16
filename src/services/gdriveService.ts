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
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'

interface DriveFileEntry {
  id: string
  name: string
  mimeType: string
}

interface DriveFileList {
  files: DriveFileEntry[]
  nextPageToken?: string
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
      if (err instanceof Error && err.message === 'Unauthorized') throw err
      if (err instanceof TypeError) throw err
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

async function findFolderId(
  name: string,
  parentId: string | null,
  token: string,
): Promise<string | null> {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  if (parentId) q += ` and '${parentId}' in parents`
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`
  const res = await driveRequest(url, token)
  const data = (await res.json()) as DriveFileList
  return data.files[0]?.id ?? null
}

async function findFileId(name: string, parentId: string, token: string): Promise<string | null> {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`
  const res = await driveRequest(url, token)
  const data = (await res.json()) as DriveFileList
  return data.files[0]?.id ?? null
}

async function downloadFileJson<T>(fileId: string, token: string): Promise<T> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`
  const res = await driveRequest(url, token)
  return res.json() as Promise<T>
}

/** Get vault folder ID, cached in IDB */
async function getVaultFolderId(token: string): Promise<string> {
  const cached = await indexedDBService.getFolderIds()
  if (cached['vault']) return cached['vault']

  const vaultName = import.meta.env.VITE_GDRIVE_FOLDER_NAME as string
  const folderId = await findFolderId(vaultName, null, token)
  if (!folderId) throw new Error(`Vault folder "${vaultName}" not found in Drive`)

  await indexedDBService.saveFolderIds({ ...cached, vault: folderId })
  return folderId
}

/**
 * Get or create the flashcards output folder inside the vault.
 * Creates it if it doesn't exist yet (first sync from browser).
 */
async function getOrCreateFlashcardsFolderId(token: string): Promise<string> {
  const cached = await indexedDBService.getFolderIds()
  if (cached['flashcards']) return cached['flashcards']

  const flashcardsName = import.meta.env.VITE_GDRIVE_FLASHCARDS_FOLDER as string
  const vaultFolderId = await getVaultFolderId(token)

  let folderId = await findFolderId(flashcardsName, vaultFolderId, token)

  if (!folderId) {
    // Create the flashcards subfolder on first sync
    const res = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: flashcardsName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [vaultFolderId],
      }),
    })
    if (!res.ok) throw new Error(`Failed to create flashcards folder: ${res.status}`)
    const created = (await res.json()) as { id: string }
    folderId = created.id
  }

  await indexedDBService.saveFolderIds({ ...cached, flashcards: folderId })
  return folderId
}

/** List all direct children (files + folders) of a Drive folder */
async function listChildren(
  folderId: string,
  token: string,
): Promise<DriveFileEntry[]> {
  const results: DriveFileEntry[] = []
  let pageToken: string | undefined

  do {
    const q = `'${folderId}' in parents and trashed=false`
    let url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType)&pageSize=100`
    if (pageToken) url += `&pageToken=${pageToken}`
    const res = await driveRequest(url, token)
    const data = (await res.json()) as DriveFileList
    results.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)

  return results
}

const SKIP_FOLDER_NAMES = new Set([
  '07 - Templates',
  '08 - Archive',
  '06 - Journals',
  'Attachments',
  'flashcards',
])

/** Recursively walk vault folder and return all markdown file entries (max 3 levels deep) */
async function walkVaultForMarkdown(
  folderId: string,
  token: string,
  depth = 0,
): Promise<DriveFileEntry[]> {
  if (depth > 3) return []
  const children = await listChildren(folderId, token)
  const mdFiles: DriveFileEntry[] = []

  for (const entry of children) {
    if (entry.mimeType === 'application/vnd.google-apps.folder') {
      if (!SKIP_FOLDER_NAMES.has(entry.name)) {
        mdFiles.push(...(await walkVaultForMarkdown(entry.id, token, depth + 1)))
      }
    } else if (
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('.') &&
      entry.mimeType !== 'application/vnd.google-apps.document'
    ) {
      mdFiles.push(entry)
    }
  }

  return mdFiles
}

/** Download a Drive file as plain text */
async function downloadFileText(fileId: string, token: string): Promise<string> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`
  const res = await driveRequest(url, token)
  return res.text()
}

/** Create or overwrite a JSON file in a Drive folder */
async function createOrUpdateJsonFile(
  name: string,
  content: unknown,
  parentFolderId: string,
  token: string,
): Promise<void> {
  const body = JSON.stringify(content, null, 2)
  const existingId = await findFileId(name, parentFolderId, token)

  if (existingId) {
    const res = await fetch(
      `${DRIVE_UPLOAD_BASE}/files/${existingId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      },
    )
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`)
  } else {
    const boundary = `fc_${Date.now()}`
    const metadata = JSON.stringify({
      name,
      parents: [parentFolderId],
      mimeType: 'application/json',
    })
    const multipart = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      body,
      `--${boundary}--`,
    ].join('\r\n')

    const res = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    })
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`)
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export const gdriveService = {
  async fetchIndex(token: string): Promise<FlashcardsIndex> {
    return withRetry(async () => {
      const folderId = await getOrCreateFlashcardsFolderId(token)
      const fileId = await findFileId('index.json', folderId, token)
      if (!fileId) throw new Error('index.json not found — tap "Sync from vault" in Settings')

      const raw = await downloadFileJson<unknown>(fileId, token)
      const parsed = FlashcardsIndexSchema.safeParse(raw)
      if (!parsed.success) {
        throw new Error(`index.json schema error: ${parsed.error.message}`)
      }
      return parsed.data as FlashcardsIndex
    })
  },

  async fetchTopicFile(slug: string, token: string): Promise<TopicFile> {
    try {
      return await withRetry(async () => {
        const folderId = await getOrCreateFlashcardsFolderId(token)
        const fileId = await findFileId(`${slug}.json`, folderId, token)
        if (!fileId) throw new Error(`${slug}.json not found`)

        const raw = await downloadFileJson<unknown>(fileId, token)
        const parsed = TopicFileSchema.safeParse(raw)
        if (!parsed.success) {
          throw new Error(`${slug}.json schema error: ${parsed.error.message}`)
        }
        return parsed.data as TopicFile
      })
    } catch (err) {
      const cached = await indexedDBService.getTopicFile(slug)
      if (cached) return cached
      if (err instanceof TypeError) {
        throw new Error("This topic hasn't been downloaded yet")
      }
      throw err
    }
  },

  /** Read all markdown files from the vault and return their content */
  async listVaultMarkdownFiles(
    token: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const vaultFolderId = await getVaultFolderId(token)
    return walkVaultForMarkdown(vaultFolderId, token)
  },

  async downloadMarkdownFile(fileId: string, token: string): Promise<string> {
    return downloadFileText(fileId, token)
  },

  async writeFlashcardFiles(
    token: string,
    files: Array<{ name: string; content: unknown }>,
  ): Promise<void> {
    const folderId = await getOrCreateFlashcardsFolderId(token)
    for (const file of files) {
      await createOrUpdateJsonFile(file.name, file.content, folderId, token)
    }
  },
}
