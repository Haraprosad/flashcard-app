import type { FlashCard } from '../types'

/**
 * Interleave cards by tier for better retention (Rohrer & Taylor 2007).
 *
 * Rules:
 * - Exploration cards always stay at position 0 (before any flashcards).
 * - Non-exploration cards are ordered T1 → T2 → T3 (tiers never mix).
 * - Within each tier, cards from different concepts are interleaved
 *   (round-robin across concept buckets) to improve cross-concept spacing.
 *
 * @param cards Raw card list (may contain exploration cards).
 * @returns Re-ordered list: exploration cards first, then T1 (concept-interleaved),
 *          then T2 (concept-interleaved), then T3 (concept-interleaved).
 */
export function interleaveByTier(cards: FlashCard[]): FlashCard[] {
  const exploration: FlashCard[] = []
  const tier1: FlashCard[] = []
  const tier2: FlashCard[] = []
  const tier3: FlashCard[] = []

  for (const card of cards) {
    if (card.type === 'exploration') {
      exploration.push(card)
    } else if (card.tier === 1) {
      tier1.push(card)
    } else if (card.tier === 2) {
      tier2.push(card)
    } else {
      tier3.push(card)
    }
  }

  return [
    ...exploration,
    ...interleaveWithinTier(tier1),
    ...interleaveWithinTier(tier2),
    ...interleaveWithinTier(tier3),
  ]
}

/** Round-robin across concept groups within a single tier. */
function interleaveWithinTier(cards: FlashCard[]): FlashCard[] {
  if (cards.length === 0) return []

  const groups = new Map<string, FlashCard[]>()
  for (const card of cards) {
    const key = card.concept_id ?? card.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(card)
  }

  for (const group of groups.values()) {
    shuffleInPlace(group)
  }

  const buckets = [...groups.values()]
  const result: FlashCard[] = []
  let remaining = cards.length

  while (remaining > 0) {
    for (const bucket of buckets) {
      if (bucket.length > 0) {
        result.push(bucket.shift()!)
        remaining--
      }
    }
  }

  return result
}

/** Fisher-Yates in-place shuffle */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
