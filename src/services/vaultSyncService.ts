import { gdriveService } from './gdriveService'
import type { FlashCard, FlashcardsIndex, TopicFile, ExplorationStep, CardType, CardTier } from '../types'

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
  type: CardType
  tier: CardTier
  concept_id?: string
}

/**
 * Extract card metadata from front-text prefixes like:
 *   [T1] [intuition] Some text
 *   [T2] [standard] Some text
 *   [T1] [cloze] Text with {{blank}}
 */
function extractCardMeta(front: string): {
  cleanFront: string
  type: CardType
  tier: CardTier
} {
  let remaining = front
  let tier: CardTier = 1
  let type: CardType = 'standard'

  // Match [T1] / [T2] / [T3]
  const tierMatch = remaining.match(/^\[T([123])\]\s*/)
  if (tierMatch) {
    tier = parseInt(tierMatch[1], 10) as CardTier
    remaining = remaining.slice(tierMatch[0].length)
  }

  // Match [intuition] / [cloze] / [standard]
  const typeMatch = remaining.match(/^\[(intuition|cloze|standard)\]\s*/i)
  if (typeMatch) {
    const raw = typeMatch[1].toLowerCase()
    if (raw === 'intuition') type = 'intuition'
    else if (raw === 'cloze') type = 'cloze'
    remaining = remaining.slice(typeMatch[0].length)
  }

  // Auto-detect cloze by {{...}} pattern if not already typed
  if (type === 'standard' && /\{\{[^}]+\}\}/.test(remaining)) {
    type = 'cloze'
  }

  return { cleanFront: remaining.trim(), type, tier }
}

const SR_META_RE = /<!--SR:[^>]+-->/g

function parseFlashcards(body: string): RawCard[] {
  const cards: RawCard[] = []
  const cleaned = body.replace(SR_META_RE, '').trim()
  const lines = cleaned.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Format 1: "Question? #flashcard\nAnswer"  (or inline: "Question #flashcard Answer")
    if (/#flashcard\b/.test(line)) {
      const rawFront = line.replace(/#flashcard\b.*/, '').trim()
      const { cleanFront, type, tier } = extractCardMeta(rawFront)

      // Also capture any text that appears AFTER #flashcard on the same line
      const inlineBackMatch = line.match(/#flashcard\b\s+(.+)/)
      const inlineBack = inlineBackMatch?.[1]?.trim() ?? ''

      const backLines: string[] = []
      i++
      while (i < lines.length) {
        const next = lines[i].trim()
        if (/#flashcard\b/.test(lines[i]) || /^\?$/.test(next)) break
        // Stop at headings and thematic breaks (---) — these are section separators, not card backs
        if (/^#{1,6}\s/.test(next) && backLines.length > 0) break
        if (/^---+$/.test(next)) break
        backLines.push(lines[i])
        i++
      }
      const nextLineBack = backLines.join('\n').replace(SR_META_RE, '').trim()
      // Prefer next-line back; fall back to inline back if next lines were empty
      const back = nextLineBack || inlineBack
      if (cleanFront && back) cards.push({ front: cleanFront, back, type, tier })
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
      const rawFront = frontLines.join('\n').trim()
      const { cleanFront, type, tier } = extractCardMeta(rawFront)
      const back = backLines.join('\n').replace(SR_META_RE, '').trim()
      if (cleanFront && back) cards.push({ front: cleanFront, back, type, tier })
      continue
    }

    i++
  }

  return cards
}

// ─── Exploration parser (===STEP: kind=== format) ──────────────────────────

interface RawExploration {
  concept_id: string
  steps: ExplorationStep[]
}

/**
 * Parses the ## 🔬 Exploration section from a note body.
 *
 * Format:
 *   ## 🔬 Exploration           ← section heading (any heading containing "Exploration")
 *   concept: some_concept_id    ← concept identifier line
 *
 *   ===STEP: scenario===        ← step delimiter
 *   ...body text...
 *
 *   ===STEP: problem===
 *   ...body text...
 *
 *   ===STEP: guide===
 *   ...body text...
 *
 *   ===STEP: challenge===
 *   **Question:** ...           ← optional bold question intro
 *   - [ ] wrong option
 *   - [x] correct option        ← [x] marks the answer (0-based index)
 *   - [ ] another wrong
 *   explanation text (after options)
 *
 * Returns null if no valid exploration block is found.
 */
function parseExploration(body: string): RawExploration | null {
  // Find the Exploration section heading
  const explorationRe = /^#{1,6}\s+.*[Ee]xploration.*$/m
  const sectionMatch = explorationRe.exec(body)
  if (!sectionMatch) return null

  // Slice from the section heading forward
  const sectionStart = sectionMatch.index + sectionMatch[0].length
  const afterHeading = body.slice(sectionStart)

  // Find where the next same-or-higher-level heading starts (so we don't bleed into Flashcards)
  const headingLevel = (sectionMatch[0].match(/^(#{1,6})/) ?? ['', '##'])[1].length
  const nextSectionRe = new RegExp(`^#{1,${headingLevel}}\\s`, 'm')
  const nextMatch = nextSectionRe.exec(afterHeading)
  const sectionBody = nextMatch
    ? afterHeading.slice(0, nextMatch.index)
    : afterHeading

  // Extract concept_id
  const conceptMatch = sectionBody.match(/^concept:\s*(\S+)/m)
  if (!conceptMatch) return null
  const concept_id = conceptMatch[1].trim()

  // Split on ===STEP: kind=== delimiters
  const stepRe = /===STEP:\s*(\w+)===/g
  const stepKinds: Array<{ kind: string; start: number }> = []
  let m: RegExpExecArray | null
  while ((m = stepRe.exec(sectionBody)) !== null) {
    stepKinds.push({ kind: m[1].toLowerCase(), start: m.index + m[0].length })
  }

  if (stepKinds.length === 0) return null

  const steps: ExplorationStep[] = []

  for (let i = 0; i < stepKinds.length; i++) {
    const { kind, start } = stepKinds[i]
    const end = i + 1 < stepKinds.length ? stepKinds[i + 1].start - stepKinds[i + 1].kind.length - 12 : sectionBody.length
    const rawBody = sectionBody.slice(start, end).trim()

    if (kind === 'challenge') {
      steps.push(parseChallengeStep(rawBody))
    } else if (kind === 'scenario' || kind === 'problem' || kind === 'guide') {
      const stepKind = kind as 'scenario' | 'problem' | 'guide'
      steps.push({
        kind: stepKind,
        title: stepKind.charAt(0).toUpperCase() + stepKind.slice(1),
        body: rawBody,
      })
    }
  }

  if (steps.length < 2) return null

  return { concept_id, steps }
}

/**
 * Parse the challenge step which may contain MC options.
 *
 * Lines with `- [ ]` or `- [x]` are options.
 * The `- [x]` index is the correct answer.
 * Lines before the options block are the question body.
 * Lines after the options block are the explanation.
 */
function parseChallengeStep(raw: string): ExplorationStep {
  const lines = raw.split('\n')
  const bodyLines: string[] = []
  const options: string[] = []
  const explanationLines: string[] = []
  let answerIndex = -1
  let inOptions = false
  let optionsDone = false

  for (const line of lines) {
    const optionMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.*)/)
    if (optionMatch) {
      inOptions = true
      const isCorrect = optionMatch[1] === 'x'
      const optionText = optionMatch[2].trim()
      if (isCorrect) answerIndex = options.length
      options.push(optionText)
    } else if (inOptions && !optionsDone) {
      optionsDone = true
      // Stop at structural markers — they don't belong to the explanation
      if (
        /^\s*>\s*\[!/.test(line) ||
        /^---+$/.test(line.trim()) ||
        /^#{1,6}\s/.test(line.trim())
      ) break
      if (line.trim()) explanationLines.push(line)
    } else if (optionsDone) {
      // Stop collecting if we hit a structural marker (callout, HR, heading)
      if (
        /^\s*>\s*\[!/.test(line) ||
        /^---+$/.test(line.trim()) ||
        /^#{1,6}\s/.test(line.trim())
      ) break
      explanationLines.push(line)
    } else {
      bodyLines.push(line)
    }
  }

  const step: ExplorationStep = {
    kind: 'challenge',
    title: 'Challenge',
    body: bodyLines.join('\n').trim(),
  }

  if (options.length > 0) {
    step.challenge_options = options
    step.challenge_answer = answerIndex >= 0 ? answerIndex : 0
  } else {
    step.challenge_input = true
  }

  const explanation = explanationLines.join('\n').trim()
  if (explanation) step.challenge_explanation = explanation

  return step
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
      const exploration = parseExploration(body)

      processed++
      onProgress({
        stage: 'reading',
        current: processed,
        total: mdFiles.length,
        message: `Reading ${file.name}…`,
      })

      const hasContent = rawCards.length > 0 || exploration !== null
      if (!hasContent) continue

      const topicSlug = slugify(meta.topic)
      if (!topicMap.has(topicSlug)) {
        topicMap.set(topicSlug, { slug: topicSlug, title: meta.topic, cards: [] })
      }

      const topic = topicMap.get(topicSlug)!
      const noteSlug = slugify(file.name.replace(/\.md$/, ''))

      // ── Exploration card (prepended so it shows first in session) ──────────
      if (exploration !== null) {
        topic.cards.push({
          id: `${topicSlug}-${noteSlug}-exploration`,
          type: 'exploration',
          tier: 1,
          front: '',
          back: '',
          steps: exploration.steps,
          topic: topicSlug,
          tags: meta.tags,
          source_file: file.name,
          created_at: generatedAt,
          concept_id: exploration.concept_id,
        })
      }

      // ── Flashcards with tier/type/concept_id metadata ─────────────────────
      for (let i = 0; i < rawCards.length; i++) {
        const raw = rawCards[i]
        topic.cards.push({
          id: `${topicSlug}-${noteSlug}-${i}`,
          type: raw.type,
          tier: raw.tier,
          front: raw.front,
          back: raw.back,
          topic: topicSlug,
          tags: meta.tags,
          source_file: file.name,
          created_at: generatedAt,
          // Link flashcards to the same concept_id as the exploration card
          ...(exploration ? { concept_id: exploration.concept_id } : {}),
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
