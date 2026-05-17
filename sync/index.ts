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
 * Card formats supported:
 *
 * 1. Standard (legacy):
 *    Question text here? #flashcard
 *    Answer text here.
 *
 * 2. Tiered + typed (new):
 *    [T1] [intuition] Imagine: you drop a glass... Why not? #flashcard
 *    There's only 1 arrangement but millions of scattered ones...
 *
 *    [T2] [standard] When a gas is compressed... #flashcard
 *    Temperature rises because...
 *
 *    [T1] [cloze] Entropy is {{c1::S = k_B ln(W)}} where {{c2::W}} is microstates. #flashcard
 *    Full revealed text.
 *
 * Cloze expansion: one line with {{c1::text}} and {{c2::text}} produces
 * multiple cards, each blanking a different segment.
 *
 * Concept grouping: add [concept:slug] on a line before related cards
 * to group them for progressive disclosure tier gating.
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

// Tier+type marker regex: [T1] [standard], [T2] [cloze], etc.
const TIER_TYPE_RE = /^\[(T[123])\]\s*\[(standard|cloze|intuition)\]\s*/
// Concept group marker: [concept:entropy]
const CONCEPT_RE = /^\[concept:([a-z0-9-]+)\]\s*$/
// Cloze segment regex: {{c1::hidden text}}
const CLOZE_RE = /\{\{c(\d+)::([^}]+)\}\}/g

type CardType = 'standard' | 'cloze' | 'intuition'
type CardTier = 1 | 2 | 3

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

/** Parse tier/type markers from the front of a card line */
function parseCardMeta(line: string): { tier: CardTier; type: CardType; rest: string } {
  const match = TIER_TYPE_RE.exec(line)
  if (match) {
    const tier = parseInt(match[1][1], 10) as CardTier
    const type = match[2] as CardType
    const rest = line.slice(match[0].length)
    return { tier, type, rest }
  }
  return { tier: 1, type: 'standard', rest: line }
}

/** Count distinct cloze indices (c1, c2, etc.) in a template string */
function getClozeCount(template: string): number {
  const indices = new Set<number>()
  let m: RegExpExecArray | null
  const re = new RegExp(CLOZE_RE.source, 'g')
  while ((m = re.exec(template)) !== null) {
    indices.add(parseInt(m[1], 10))
  }
  return indices.size
}

/**
 * Expand a cloze template into one card per cloze index.
 * Card N blanks only {{cN::text}}, showing all other cloze segments.
 * Returns array of { front, back } where front has blanks and back is full text.
 */
function expandCloze(
  template: string,
  fullAnswer: string,
): Array<{ front: string; back: string; clozeIndex: number }> {
  const indices = new Set<number>()
  let m: RegExpExecArray | null
  const re = new RegExp(CLOZE_RE.source, 'g')
  while ((m = re.exec(template)) !== null) {
    indices.add(parseInt(m[1], 10))
  }

  if (indices.size === 0) {
    return [{ front: template, back: fullAnswer, clozeIndex: 0 }]
  }

  const results: Array<{ front: string; back: string; clozeIndex: number }> = []
  for (const idx of indices) {
    const idxRe = new RegExp(`\\{\\{c${idx}::([^}]+)\\}\\}`, 'g')
    const otherRe = new RegExp(`\\{\\{c(?!${idx}::)[^}]+\\}\\}`, 'g')

    const front = template
      .replace(idxRe, '___')
      .replace(otherRe, (_, text) => text)

    const back = template.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')

    results.push({ front, back: back + '\n\n' + fullAnswer, clozeIndex: idx })
  }
  return results
}

// ─── Card parser ───────────────────────────────────────────────────────────

interface RawCard {
  front: string
  back: string
  tier: CardTier
  type: CardType
  conceptId: string | null
}

function parseCards(body: string): RawCard[] {
  const cards: RawCard[] = []
  const cleaned = body.replace(SR_META_RE, '').trim()
  const lines = cleaned.split('\n')

  let currentConceptId: string | null = null

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Check for concept group marker
    const conceptMatch = CONCEPT_RE.exec(line.trim())
    if (conceptMatch) {
      currentConceptId = conceptMatch[1]
      i++
      continue
    }

    // Format 1: "[T1] [type] Question? #flashcard\nAnswer" or "Question? #flashcard\nAnswer"
    if (/#flashcard\b/.test(line)) {
      const raw = line.replace(/#flashcard\b.*/, '').trim()
      const { tier, type, rest } = parseCardMeta(raw)
      const front = rest.trim()

      const backLines: string[] = []
      i++
      while (i < lines.length) {
        const next = lines[i].trim()
        if (/#flashcard\b/.test(lines[i]) || /^\?$/.test(next)) break
        if (/^#{1,6}\s/.test(next) && backLines.length > 0) break
        if (CONCEPT_RE.test(next)) break
        backLines.push(lines[i])
        i++
      }
      const back = backLines.join('\n').replace(SR_META_RE, '').trim()

      if (type === 'cloze' && getClozeCount(front) > 0) {
        const expanded = expandCloze(front, back)
        for (const exp of expanded) {
          cards.push({
            front: exp.front,
            back: exp.back,
            tier,
            type: 'cloze',
            conceptId: currentConceptId,
          })
        }
      } else if (front && back) {
        cards.push({ front, back, tier, type, conceptId: currentConceptId })
      }

      // Reset concept after each card group if not persistent
      // Concept stays active across consecutive cards until a new [concept:...] marker
      continue
    }

    // Format 2: multi-line separator "?"
    if (/^\?$/.test(line.trim()) && i > 0) {
      const frontLines: string[] = []
      let j = i - 1
      while (j >= 0 && lines[j].trim() !== '' && !/#flashcard\b/.test(lines[j])) {
        if (CONCEPT_RE.test(lines[j].trim())) break
        frontLines.unshift(lines[j])
        j--
      }
      const rawFront = frontLines.join('\n').trim()
      const { tier, type, rest } = parseCardMeta(rawFront)
      const front = rest.trim()

      const backLines: string[] = []
      i++
      while (i < lines.length) {
        const next = lines[i].trim()
        if (next === '' && backLines.length > 0) { i++; break }
        if (/#flashcard\b/.test(lines[i]) || /^\?$/.test(next)) break
        if (CONCEPT_RE.test(next)) break
        backLines.push(lines[i])
        i++
      }
      const back = backLines.join('\n').replace(SR_META_RE, '').trim()

      if (type === 'cloze' && getClozeCount(front) > 0) {
        const expanded = expandCloze(front, back)
        for (const exp of expanded) {
          cards.push({
            front: exp.front,
            back: exp.back,
            tier,
            type: 'cloze',
            conceptId: currentConceptId,
          })
        }
      } else if (front && back) {
        cards.push({ front, back, tier, type, conceptId: currentConceptId })
      }
      continue
    }

    i++
  }

  return cards
}

// ─── Main ──────────────────────────────────────────────────────────────────

interface FlashCard {
  id: string
  type: CardType
  tier: CardTier
  front: string
  back: string
  topic: string
  tags: string[]
  source_file: string
  created_at: string
  concept_id?: string
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
      const c = rawCards[i]
      const card: FlashCard = {
        id: `${topicSlug}-${noteSlug}-${i}`,
        type: c.type,
        tier: c.tier,
        front: c.front,
        back: c.back,
        topic: topicSlug,
        tags,
        source_file: sourceFile,
        created_at: generatedAt,
      }
      if (c.conceptId) card.concept_id = c.conceptId
      topic.cards.push(card)
      totalCards++
    }
  }

  if (totalCards === 0) {
    console.log('No flashcards found in any note.')
    console.log('Add cards using: [T1] [standard] Question? #flashcard')
    console.log('                 Answer on the next line.')
    return
  }

  console.log(`\nWriting JSON files...`)
  const topicMetas = []

  for (const [slug, topic] of topicMap.entries()) {
    const topicFile = {
      version: '2.0',
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
    version: '2.0',
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
