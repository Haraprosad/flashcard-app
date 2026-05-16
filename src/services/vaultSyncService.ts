import { gdriveService } from './gdriveService'
import type { FlashCard, FlashcardsIndex, TopicFile } from '../types'

// ─── Frontmatter parser ────────────────────────────────────────────────────

interface NoteMeta {
  title: string
  topic: string
  tags: string[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const GENERIC_TAGS = new Set([
  'permanent', 'dev', 'atomic', 'moc', 'inbox',
  'archive', 'flashcard', 'journal',
])

function parseMeta(raw: string, filename: string): { meta: NoteMeta; body: string } {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  const yamlText = fmMatch?.[1] ?? ''
  const body = fmMatch?.[2] ?? raw

  // Extract title
  const titleMatch = yamlText.match(/^title:\s*(.+)$/m)
  const title = titleMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ??
    filename.replace(/\.md$/, '')

  // Extract topic
  const topicMatch = yamlText.match(/^topic:\s*(.+)$/m)
  const topicRaw = topicMatch?.[1]?.trim().replace(/^["']|["']$/g, '')

  // Extract tags (inline [a,b] or multi-line - a\n- b)
  let tags: string[] = []
  const inlineTagsMatch = yamlText.match(/^tags:\s*\[([^\]]+)\]/m)
  if (inlineTagsMatch) {
    tags = inlineTagsMatch[1].split(',').map((t) => t.trim())
  } else {
    const blockStart = yamlText.indexOf('tags:')
    if (blockStart !== -1) {
      const afterTags = yamlText.slice(blockStart + 5)
      const tagLines = afterTags.match(/(?:^|\n)\s*-\s*(.+)/g) ?? []
      tags = tagLines.map((l) => l.replace(/^\s*-\s*/, '').trim())
    }
  }

  // Derive topic: explicit field → first non-generic tag → filename
  let topic: string
  let topicSlug: string
  if (topicRaw) {
    topic = topicRaw
    topicSlug = slugify(topicRaw)
  } else {
    const tag = tags.find((t) => !GENERIC_TAGS.has(t.toLowerCase()))
    if (tag) {
      topicSlug = slugify(tag)
      topic = titleCase(topicSlug)
    } else {
      topicSlug = slugify(filename.replace(/\.md$/, ''))
      topic = filename.replace(/\.md$/, '')
    }
  }

  return {
    meta: { title, topic, tags },
    body,
  }
}

// ─── Flashcard parser (#flashcard format) ─────────────────────────────────

interface RawCard {
  front: string
  back: string
}

const SR_META_RE = /<!--SR:[^>]+-->/g

function parseFlashcards(body: string): RawCard[] {
  const cards: RawCard[] = []
  const cleaned = body.replace(SR_META_RE, '').trim()
  const lines = cleaned.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Format 1: "Question? #flashcard\nAnswer"
    if (/#flashcard\b/.test(line)) {
      const front = line.replace(/#flashcard\b.*/, '').trim()
      const backLines: string[] = []
      i++
      while (i < lines.length) {
        const next = lines[i].trim()
        if (/#flashcard\b/.test(lines[i]) || /^\?$/.test(next)) break
        if (/^#{1,6}\s/.test(next) && backLines.length > 0) break
        backLines.push(lines[i])
        i++
      }
      const back = backLines.join('\n').replace(SR_META_RE, '').trim()
      if (front && back) cards.push({ front, back })
      continue
    }

    // Format 2: multi-line separator "?"
    if (/^\?$/.test(line.trim()) && i > 0) {
      const frontLines: string[] = []
      let j = i - 1
      while (j >= 0 && lines[j].trim() !== '' && !/#flashcard\b/.test(lines[j])) {
        frontLines.unshift(lines[j])
        j--
      }
      const backLines: string[] = []
      i++
      while (i < lines.length) {
        const next = lines[i].trim()
        if (next === '' && backLines.length > 0) {
          i++
          break
        }
        if (/#flashcard\b/.test(lines[i]) || /^\?$/.test(next)) break
        backLines.push(lines[i])
        i++
      }
      const front = frontLines.join('\n').trim()
      const back = backLines.join('\n').replace(SR_META_RE, '').trim()
      if (front && back) cards.push({ front, back })
      continue
    }

    i++
  }

  return cards
}

// ─── Public sync API ───────────────────────────────────────────────────────

export interface SyncProgress {
  stage: 'listing' | 'reading' | 'writing' | 'done'
  current?: number
  total?: number
  message: string
}

export interface SyncResult {
  topicCount: number
  cardCount: number
}

export const vaultSyncService = {
  async syncVault(
    token: string,
    onProgress: (p: SyncProgress) => void,
  ): Promise<SyncResult> {
    onProgress({ stage: 'listing', message: 'Scanning vault for notes…' })

    const mdFiles = await gdriveService.listVaultMarkdownFiles(token)
    onProgress({
      stage: 'reading',
      current: 0,
      total: mdFiles.length,
      message: `Found ${mdFiles.length} notes — reading…`,
    })

    const topicMap = new Map<string, { title: string; slug: string; cards: FlashCard[] }>()
    const generatedAt = new Date().toISOString()
    let processed = 0

    for (const file of mdFiles) {
      const raw = await gdriveService.downloadMarkdownFile(file.id, token)
      const { meta, body } = parseMeta(raw, file.name)
      const rawCards = parseFlashcards(body)

      processed++
      onProgress({
        stage: 'reading',
        current: processed,
        total: mdFiles.length,
        message: `Reading ${file.name}…`,
      })

      if (rawCards.length === 0) continue

      const topicSlug = slugify(meta.topic)
      if (!topicMap.has(topicSlug)) {
        topicMap.set(topicSlug, { slug: topicSlug, title: meta.topic, cards: [] })
      }

      const topic = topicMap.get(topicSlug)!
      const noteSlug = slugify(file.name.replace(/\.md$/, ''))

      for (let i = 0; i < rawCards.length; i++) {
        topic.cards.push({
          id: `${topicSlug}-${noteSlug}-${i}`,
          front: rawCards[i].front,
          back: rawCards[i].back,
          topic: topicSlug,
          tags: meta.tags,
          source_file: file.name,
          created_at: generatedAt,
        })
      }
    }

    onProgress({ stage: 'writing', message: 'Writing flashcard files to Drive…' })

    const topicMetas: FlashcardsIndex['topics'] = []
    const filesToWrite: Array<{ name: string; content: unknown }> = []

    for (const [slug, topic] of topicMap.entries()) {
      const topicFile: TopicFile = {
        version: '1.0',
        slug,
        title: topic.title,
        generated_at: generatedAt,
        cards: topic.cards,
      }
      filesToWrite.push({ name: `${slug}.json`, content: topicFile })
      topicMetas.push({
        slug,
        title: topic.title,
        card_count: topic.cards.length,
        source_files: [...new Set(topic.cards.map((c) => c.source_file))],
        generated_at: generatedAt,
      })
    }

    const index: FlashcardsIndex = {
      version: '1.0',
      generated_at: generatedAt,
      topics: topicMetas,
    }
    filesToWrite.push({ name: 'index.json', content: index })

    await gdriveService.writeFlashcardFiles(token, filesToWrite)

    const totalCards = topicMetas.reduce((s, t) => s + t.card_count, 0)
    onProgress({
      stage: 'done',
      message: `Done — ${totalCards} cards across ${topicMetas.length} topics`,
    })

    return { topicCount: topicMetas.length, cardCount: totalCards }
  },
}
