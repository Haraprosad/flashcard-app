import type { FlashCard, SRState } from '../types'
import { srStateService } from './srStateService'

interface ConceptProgress {
  t1Done: boolean
  t2Done: boolean
}

/**
 * Get tier eligibility for cards based on their concept grouping and SR state.
 *
 * Rules:
 * - Cards without a concept_id are always eligible (no gating).
 * - If the concept has an unexplored exploration card → ALL tiers are gated.
 * - T1 cards are always eligible once exploration is cleared.
 * - T2 cards require T1 rated Good/Easy at least once.
 * - T3 cards require T2 rated Good/Easy at least once.
 * - Exploration cards themselves are never returned (handled separately).
 */
export function getTierEligibleCards(
  cards: FlashCard[],
  srState: SRState,
): FlashCard[] {
  // Group cards by concept_id
  const conceptGroups = new Map<string, FlashCard[]>()
  const ungrouped: FlashCard[] = []

  for (const card of cards) {
    if (card.type === 'exploration') continue // handled separately by session
    if (!card.concept_id) {
      ungrouped.push(card)
    } else {
      const group = conceptGroups.get(card.concept_id) ?? []
      group.push(card)
      conceptGroups.set(card.concept_id, group)
    }
  }

  const eligible: FlashCard[] = [...ungrouped]

  for (const [conceptId, group] of conceptGroups) {
    // If there's an exploration card for this concept that hasn't been explored yet,
    // gate all tiers until the user completes it.
    const hasExploration = cards.some(
      (c) => c.type === 'exploration' && c.concept_id === conceptId,
    )
    if (hasExploration && !srStateService.isExplored(conceptId)) {
      continue // all tiers blocked until exploration is done
    }

    const progress = getConceptProgress(group, srState)

    for (const card of group) {
      if (card.tier === 1) {
        eligible.push(card)
      } else if (card.tier === 2 && progress.t1Done) {
        eligible.push(card)
      } else if (card.tier === 3 && progress.t2Done) {
        eligible.push(card)
      }
    }
  }

  return eligible
}

/**
 * Returns the exploration card for a concept if one exists.
 */
export function getConceptExplorationCard(
  conceptId: string,
  cards: FlashCard[],
): FlashCard | undefined {
  return cards.find((c) => c.type === 'exploration' && c.concept_id === conceptId)
}

/**
 * Check whether the lower-tier cards in a concept group have been mastered
 * enough to unlock higher tiers.
 */
function getConceptProgress(
  group: FlashCard[],
  srState: SRState,
): ConceptProgress {
  const t1Card = group.find((c) => c.tier === 1)
  const t2Card = group.find((c) => c.tier === 2)

  let t1Done = false
  let t2Done = false

  if (t1Card) {
    const data = srState[t1Card.id]
    t1Done = isTierMastered(data)
  } else {
    // No T1 card in group — allow T2 by default
    t1Done = true
  }

  if (t2Card) {
    const data = srState[t2Card.id]
    t2Done = t1Done && isTierMastered(data)
  } else {
    // No T2 card in group — T3 allowed only if T1 was mastered
    t2Done = t1Done
  }

  return { t1Done, t2Done }
}

/**
 * A tier is "mastered" if the card has been reviewed at least once
 * with a Good or Easy rating. We check:
 * - reps >= 1 (has been reviewed)
 * - state !== 0 (not New — has been through at least one review)
 * - lapses < reps (not all reviews were "Again")
 */
function isTierMastered(data: { reps: number; state: number; lapses: number } | undefined): boolean {
  if (!data) return false
  return data.reps >= 1 && data.state !== 0 && data.lapses < data.reps
}

/**
 * Count tier breakdown for a set of cards.
 */
export function getTierBreakdown(cards: FlashCard[]): {
  t1: number
  t2: number
  t3: number
} {
  let t1 = 0
  let t2 = 0
  let t3 = 0
  for (const card of cards) {
    if (card.tier === 1) t1++
    else if (card.tier === 2) t2++
    else if (card.tier === 3) t3++
  }
  return { t1, t2, t3 }
}
