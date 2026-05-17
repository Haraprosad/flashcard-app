// Top-level index file listing all topics — stored as index.json in Drive
export interface FlashcardsIndex {
  version: string
  generated_at: string
  topics: TopicMeta[]
}

// One entry per topic in the index
export interface TopicMeta {
  slug: string           // URL-safe identifier, e.g. "kubernetes"
  title: string          // Display name, e.g. "Kubernetes"
  card_count: number
  source_files: string[] // Original .md filenames that contributed cards
  generated_at: string   // ISO timestamp of last sync for this topic
}

// Per-topic file — stored as {slug}.json in Drive
export interface TopicFile {
  version: string
  slug: string
  title: string
  generated_at: string
  cards: FlashCard[]
}

export type CardType = 'standard' | 'cloze' | 'intuition' | 'exploration'
export type CardTier = 1 | 2 | 3

// One step in a 4-step exploration flow (scenario → problem → guide → challenge)
export interface ExplorationStep {
  kind: 'scenario' | 'problem' | 'guide' | 'challenge'
  title: string
  body: string
  challenge_options?: string[]   // Multiple-choice answers for challenge step
  challenge_answer?: number      // 0-based index into challenge_options
  challenge_input?: boolean      // True = free-text input instead of multiple choice
  challenge_explanation?: string // Shown after wrong answer before retry
}

export interface FlashCard {
  id: string             // Stable format: "{slug}-{basename}-{index}"
  type: CardType         // Card format. Defaults to 'standard' if absent (backward compat)
  tier: CardTier         // Progressive disclosure level. Defaults to 1 if absent
  front: string          // Question / scenario / cloze template. Empty string for 'exploration'.
  back: string           // Answer / explanation / revealed cloze text. Empty for 'exploration'.
  steps?: ExplorationStep[] // Only for type='exploration'. The 4-step walkthrough.
  topic: string
  tags: string[]
  source_file: string    // Original .md filename in vault
  created_at: string     // ISO timestamp
  concept_id?: string    // Groups tiered cards for the same concept (e.g. "entropy")
                         // Used for tier gating. If absent, no gating applied.
}

// Full SR state persisted to localStorage under key "sr_state"
export interface SRState {
  [cardId: string]: CardSRData
}

export interface CardSRData {
  due: string            // ISO timestamp — next review due date
  stability: number      // FSRS stability
  difficulty: number     // FSRS difficulty (1–10)
  elapsed_days: number
  scheduled_days: number
  reps: number           // Total reviews
  lapses: number         // Times rated Again
  state: 0 | 1 | 2 | 3  // New=0 Learning=1 Review=2 Relearning=3
  last_review: string    // ISO timestamp
}

// Maps to FSRS Rating: Again=1, Hard=2, Good=3, Easy=4
export type Rating = 'Again' | 'Hard' | 'Good' | 'Easy'

export interface StreakData {
  current: number
  longest: number
  last_review_date: string | null // YYYY-MM-DD
}

export interface ReviewLogEntry {
  date: string           // YYYY-MM-DD
  count: number
}

export interface TopicStats {
  slug: string
  total: number
  mastered: number       // reps >= 3 AND state === 2 (Review)
  learning: number       // state === 1 or 3
  newCards: number       // state === 0
  masteryPct: number     // mastered / total * 100
  dueToday: number
}
