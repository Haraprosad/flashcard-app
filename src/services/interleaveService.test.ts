import { describe, it, expect } from 'vitest'
import { interleaveByTier } from './interleaveService'
import type { FlashCard } from '../types'

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

describe('interleaveByTier', () => {
  it('all T1 cards appear before any T2 cards', () => {
    const cards = [
      makeCard('t2-a', 2, 'conceptA'),
      makeCard('t1-a', 1, 'conceptA'),
      makeCard('t2-b', 2, 'conceptB'),
      makeCard('t1-b', 1, 'conceptB'),
    ]
    const result = interleaveByTier(cards)
    const t1Indices = result.flatMap((c, i) => (c.tier === 1 ? [i] : []))
    const t2Indices = result.flatMap((c, i) => (c.tier === 2 ? [i] : []))
    const lastT1 = Math.max(...t1Indices)
    const firstT2 = Math.min(...t2Indices)
    expect(lastT1).toBeLessThan(firstT2)
  })

  it('all T1 cards appear before any T3 cards', () => {
    const cards = [
      makeCard('t3-a', 3, 'conceptA'),
      makeCard('t1-a', 1, 'conceptA'),
    ]
    const result = interleaveByTier(cards)
    expect(result[0].tier).toBe(1)
    expect(result[1].tier).toBe(3)
  })

  it('exploration cards are placed first, before all FSRS cards', () => {
    const cards = [
      makeCard('t1-a', 1, 'concept1'),
      makeCard('explore-0', 1, 'concept1', 'exploration'),
      makeCard('t1-b', 1, 'concept2'),
    ]
    const result = interleaveByTier(cards)
    expect(result[0].type).toBe('exploration')
    expect(result[1].type).not.toBe('exploration')
  })

  it('cards from different concepts alternate within T1', () => {
    const cards = [
      makeCard('c1-1', 1, 'concept1'),
      makeCard('c1-2', 1, 'concept1'),
      makeCard('c2-1', 1, 'concept2'),
      makeCard('c2-2', 1, 'concept2'),
    ]
    const result = interleaveByTier(cards)
    const t1 = result.filter((c) => c.tier === 1)
    // With 2 per concept and interleaving, adjacent cards should have different concept_ids
    for (let i = 0; i + 1 < t1.length; i++) {
      expect(t1[i].concept_id).not.toBe(t1[i + 1].concept_id)
    }
  })

  it('returns an empty array for empty input', () => {
    expect(interleaveByTier([])).toEqual([])
  })

  it('single concept: order is shuffled but all present', () => {
    const cards = [
      makeCard('c1-1', 1, 'concept1'),
      makeCard('c1-2', 1, 'concept1'),
    ]
    const result = interleaveByTier(cards)
    expect(result).toHaveLength(2)
    expect(result.every((c) => c.tier === 1)).toBe(true)
  })

  it('multiple exploration cards all stay at the front', () => {
    const cards = [
      makeCard('t1-x', 1, 'conceptX'),
      makeCard('explore-a', 1, 'conceptA', 'exploration'),
      makeCard('explore-b', 1, 'conceptB', 'exploration'),
    ]
    const result = interleaveByTier(cards)
    expect(result[0].type).toBe('exploration')
    expect(result[1].type).toBe('exploration')
    expect(result[2].type).toBe('standard')
  })
})
