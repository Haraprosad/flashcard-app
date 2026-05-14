import type { FlashcardsIndex, TopicFile } from '../types'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'

interface DriveFileList {
  files: Array<{ id: string; name: string }>
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

export const gdriveService = {
  async fetchIndex(token: string): Promise<FlashcardsIndex> {
    const parentFolderId = await findFolderId('ObsidianSecondBrain', null, token)
    if (!parentFolderId) throw new Error('Parent folder not found')

    const folderId = await findFolderId('flashcards', parentFolderId, token)
    if (!folderId) throw new Error('Flashcards folder not found')

    const fileId = await findFileId('index.json', folderId, token)
    if (!fileId) throw new Error('index.json not found')

    return downloadFileJson<FlashcardsIndex>(fileId, token)
  },

  async fetchTopicFile(slug: string, token: string): Promise<TopicFile> {
    const parentFolderId = await findFolderId('ObsidianSecondBrain', null, token)
    if (!parentFolderId) throw new Error('Parent folder not found')

    const folderId = await findFolderId('flashcards', parentFolderId, token)
    if (!folderId) throw new Error('Flashcards folder not found')

    const fileId = await findFileId(`${slug}.json`, folderId, token)
    if (!fileId) throw new Error(`${slug}.json not found`)

    return downloadFileJson<TopicFile>(fileId, token)
  },
}
