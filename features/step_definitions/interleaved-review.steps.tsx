import { Given, When, Then } from '@cucumber/cucumber'
import { interleaveByTier } from '../../src/services/interleaveService'
import type { FlashCard } from '../../src/types'

function makeCard(id: string, tier: 1 | 2 | 3, conceptId: string, type: 'standard' | 'exploration' = 'standard'): FlashCard {
  return {
    id,
    type,
    tier,
    front: type === 'exploration' ? '' : `Q ${id}`,
    back: type === 'exploration' ? '' : `A ${id}`,
    topic: 'topic',
    tags: [],
    source_file: 'topic.md',
    created_at: new Date().toISOString(),
    concept_id: conceptId,
  }
}

Given('I have cards with T1 and T2 tiers', function () {
  this.inputCards = [
    makeCard('t2-a', 2, 'conceptA'),
    makeCard('t1-a', 1, 'conceptA'),
    makeCard('t2-b', 2, 'conceptB'),
    makeCard('t1-b', 1, 'conceptB'),
  ]
})

Given('I have T1 cards from two different concepts', function () {
  this.inputCards = [
    makeCard('c1-1', 1, 'concept1'),
    makeCard('c1-2', 1, 'concept1'),
    makeCard('c2-1', 1, 'concept2'),
    makeCard('c2-2', 1, 'concept2'),
  ]
})

Given('I have an exploration card and T1 flashcards', function () {
  this.inputCards = [
    makeCard('t1-a', 1, 'concept1'),
    makeCard('explore-0', 1, 'concept1', 'exploration'),
    makeCard('t1-b', 1, 'concept2'),
  ]
})

When('I interleave the cards', function () {
  this.result = interleaveByTier(this.inputCards as FlashCard[])
})

Then('all T1 cards should come before any T2 cards', function () {
  const result = this.result as FlashCard[]
  let seenT2 = false
  for (const card of result) {
    if (card.type === 'exploration') continue
    if (card.tier === 2) { seenT2 = true }
    if (seenT2 && card.tier === 1) {
      throw new Error(`T1 card "${card.id}" found after a T2 card`)
    }
  }
})

Then('the T1 cards should alternate between concepts', function () {
  const result = this.result as FlashCard[]
  const t1 = result.filter((c) => c.tier === 1 && c.type !== 'exploration')
  // With 2 cards per concept interleaved, consecutive cards should not share concept_id
  for (let i = 0; i + 1 < t1.length; i++) {
    if (t1[i].concept_id === t1[i + 1].concept_id) {
      throw new Error(
        `Cards at positions ${i} and ${i + 1} have the same concept_id "${t1[i].concept_id}" — not alternating`,
      )
    }
  }
})

Then('the first card should be the exploration card', function () {
  const result = this.result as FlashCard[]
  const first = result[0]
  if (!first || first.type !== 'exploration') {
    throw new Error(`Expected exploration card at position 0, got type="${first?.type}"`)
  }
})
