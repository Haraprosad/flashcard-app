#!/usr/bin/env tsx
/**
 * Flashcard sync script — parses #flashcard cards from Obsidian notes
 *
 * Reads SecondBrainObsidian/*.md → extracts embedded #flashcard cards →
 * writes SecondBrainObsidian/flashcards/index.json + {slug}.json
 * Google Drive desktop app syncs the output folder to the cloud automatically.
 *
 * No API key needed — Claude.ai cowork writes the notes with cards embedded.
 *
 * Card format (Obsidian Spaced Repetition plugin):
 *   Question text here? #flashcard
 *   Answer text here.
 *
 * Run: npm run sync
 */

import matter from 'gray-matter'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ─── Config ────────────────────────────────────────────────────────────────

const VAULT_PATH =
  process.env.SYNC_VAULT_PATH ??
  path.join(
    os.homedir(),
    'Library/CloudStorage/GoogleDrive-dev.haraprosad@gmail.com/My Drive/SecondBrainObsidian',
  )

const OUTPUT_PATH = path.join(VAULT_PATH, 'flashcards')

const SKIP_DIRS = new Set([
  '07 - Templates',
  '08 - Archive',
  '06 - Journals',
  'Attachments',
  'flashcards',
])

const GENERIC_TAGS = new Set([
  'permanent', 'dev', 'atomic', 'moc', 'inbox',
  'archive', 'flashcard', 'journal',
])

const SR_META_RE = /<!--SR:[^>]+-->/g

// ─── Helpers ───────────────────────────────────────────────────────────────

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

function walkDir(dir: string): string[] {
  const files: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      files.push(...walkDir(path.join(dir, entry.name)))
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
      files.push(path.join(dir, entry.name))
    }
  }
  return files
}

function getTopic(
  frontmatter: Record<string, unknown>,
  filePath: string,
): { slug: string; title: string } {
  const explicit = frontmatter['topic'] as string | undefined
  if (explicit) return { slug: slugify(explicit), title: explicit }

  const tags = (frontmatter['tags'] as string[] | undefined) ?? []
  const tag = tags.find((t) => !GENERIC_TAGS.has(t.toLowerCase()))
  if (tag) {
    const slug = slugify(tag)
    return { slug, title: titleCase(slug) }
  }

  const rel = path.relative(VAULT_PATH, filePath)
  const topFolder = rel.split(path.sep)[0]
  const clean = topFolder.replace(/^\d+\s*-\s*/, '')
  return { slug: slugify(clean), title: clean }
}

// ─── Card parser ───────────────────────────────────────────────────────────

interface RawCard {
  front: string
  back: string
}

function parseCards(body: string): RawCard[] {
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
        if (next === '' && backLines.length > 0) { i++; break }
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

// ─── Main ──────────────────────────────────────────────────────────────────

interface FlashCard {
  id: string
  front: string
  back: string
  topic: string
  tags: string[]
  source_file: string
  created_at: string
}

interface TopicData {
  slug: string
  title: string
  cards: FlashCard[]
}

async function main() {
  if (!fs.existsSync(VAULT_PATH)) {
    console.error(`Vault not found: ${VAULT_PATH}`)
    console.error('Set SYNC_VAULT_PATH env var to override.')
    process.exit(1)
  }

  console.log(`Vault:  ${VAULT_PATH}`)
  console.log(`Output: ${OUTPUT_PATH}\n`)

  fs.mkdirSync(OUTPUT_PATH, { recursive: true })

  const mdFiles = walkDir(VAULT_PATH)
  console.log(`Scanning ${mdFiles.length} markdown files...\n`)

  const topicMap = new Map<string, TopicData>()
  const generatedAt = new Date().toISOString()
  let totalCards = 0

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    let parsed: matter.GrayMatterFile<string>
    try {
      parsed = matter(raw)
    } catch {
      // Malformed YAML frontmatter (e.g. unquoted colons in source: field)
      // Strip frontmatter and parse body only
      const bodyOnly = raw.replace(/^---[\s\S]*?---\n?/, '')
      parsed = matter(bodyOnly)
    }

    const rawCards = parseCards(parsed.content)
    if (rawCards.length === 0) continue

    const { slug: topicSlug, title: topicTitle } = getTopic(
      parsed.data as Record<string, unknown>,
      filePath,
    )
    const sourceFile = path.basename(filePath)
    const noteSlug = slugify(path.basename(filePath, '.md'))
    const tags = (parsed.data['tags'] as string[] | undefined) ?? []

    console.log(`  [${topicTitle}] ${sourceFile} — ${rawCards.length} cards`)

    if (!topicMap.has(topicSlug)) {
      topicMap.set(topicSlug, { slug: topicSlug, title: topicTitle, cards: [] })
    }

    const topic = topicMap.get(topicSlug)!
    for (let i = 0; i < rawCards.length; i++) {
      topic.cards.push({
        id: `${topicSlug}-${noteSlug}-${i}`,
        front: rawCards[i].front,
        back: rawCards[i].back,
        topic: topicSlug,
        tags,
        source_file: sourceFile,
        created_at: generatedAt,
      })
      totalCards++
    }
  }

  if (totalCards === 0) {
    console.log('No flashcards found in any note.')
    console.log('Add cards using: Question? #flashcard')
    console.log('                 Answer on the next line.')
    return
  }

  console.log(`\nWriting JSON files...`)
  const topicMetas = []

  for (const [slug, topic] of topicMap.entries()) {
    const topicFile = {
      version: '1.0',
      slug,
      title: topic.title,
      generated_at: generatedAt,
      cards: topic.cards,
    }
    fs.writeFileSync(
      path.join(OUTPUT_PATH, `${slug}.json`),
      JSON.stringify(topicFile, null, 2),
    )
    console.log(`  ${slug}.json — ${topic.cards.length} cards`)

    topicMetas.push({
      slug,
      title: topic.title,
      card_count: topic.cards.length,
      source_files: [...new Set(topic.cards.map((c) => c.source_file))],
      generated_at: generatedAt,
    })
  }

  const index = {
    version: '1.0',
    generated_at: generatedAt,
    topics: topicMetas,
  }
  fs.writeFileSync(path.join(OUTPUT_PATH, 'index.json'), JSON.stringify(index, null, 2))

  console.log(`\nDone — ${totalCards} cards across ${topicMetas.length} topics.`)
  console.log('Google Drive syncs SecondBrainObsidian/flashcards/ automatically.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
