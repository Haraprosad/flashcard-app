import { Given, Then, Before, After } from '@cucumber/cucumber'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { srStateService } from '../../src/services/srStateService'
import type { FlashCard, CardSRData, TopicFile } from '../../src/types'

function makeCard(overrides: Partial<FlashCard> = {}): FlashCard {
  return {
    id: 'physics-source-0',
    type: 'standard',
    tier: 1,
    front: 'Question',
    back: 'Answer',
    topic: 'physics',
    tags: [],
    source_file: 'physics.md',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeDueSRData(overrides: Partial<CardSRData> = {}): CardSRData {
  return {
    due: new Date().toISOString(),
    stability: 5,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 1,
    reps: 3,
    lapses: 0,
    state: 2,
    last_review: new Date(Date.now() - 86400000).toISOString(),
    ...overrides,
  }
}

Before(function () {
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
})

After(function () {
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useReviewStore.getState().reset()
  srStateService._resetForTests()
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('a concept {string} has T1, T2, and T3 cards', function (conceptId: string) {
  const cards: FlashCard[] = [
    makeCard({
      id: `physics-${conceptId}-t1`,
      tier: 1,
      concept_id: conceptId,
      front: `[T1] Intuition for ${conceptId}`,
      back: `Intuition answer for ${conceptId}`,
    }),
    makeCard({
      id: `physics-${conceptId}-t2`,
      tier: 2,
      concept_id: conceptId,
      front: `[T2] Mechanism for ${conceptId}`,
      back: `Mechanism answer for ${conceptId}`,
    }),
    makeCard({
      id: `physics-${conceptId}-t3`,
      tier: 3,
      concept_id: conceptId,
      front: `[T3] Formal for ${conceptId}`,
      back: `Formal answer for ${conceptId}`,
    }),
  ]

  const topic: TopicFile = {
    version: '2.0',
    slug: 'physics',
    title: 'Physics',
    generated_at: new Date().toISOString(),
    cards,
  }

  useTopicStore.setState({
    topics: { physics: topic },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })
})

Given('the T1 card has never been reviewed', function () {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (const card of allCards) {
    if (card.tier !== 1) {
      srStateService.updateCard(card.id, makeDueSRData())
    }
    // T1 cards get no entry = never reviewed
  }
})

Given('the T1 card has been rated Good', function () {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (const card of allCards) {
    if (card.tier === 1) {
      srStateService.updateCard(card.id, makeDueSRData({ reps: 2, lapses: 0, state: 2 }))
    }
  }
})

Given('the T2 card has never been reviewed', function () {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (const card of allCards) {
    if (card.tier === 1) {
      srStateService.updateCard(card.id, makeDueSRData({ reps: 2, lapses: 0, state: 2 }))
    }
    // T2 and T3 have no SR entry = never reviewed
  }
})

Given('the T2 card has been rated Good', function () {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (const card of allCards) {
    if (card.tier === 1 || card.tier === 2) {
      srStateService.updateCard(card.id, makeDueSRData({ reps: 2, lapses: 0, state: 2 }))
    }
  }
})

Given('the T3 card has never been reviewed', function () {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (const card of allCards) {
    if (card.tier === 1 || card.tier === 2) {
      srStateService.updateCard(card.id, makeDueSRData({ reps: 2, lapses: 0, state: 2 }))
    }
    // T3 intentionally left out
  }
})

Given('the T1 card has been rated Again \\(lapses >= reps\\)', function () {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (const card of allCards) {
    if (card.tier === 1) {
      srStateService.updateCard(card.id, makeDueSRData({ reps: 2, lapses: 2, state: 1 }))
    }
  }
})

Given('no cards have been reviewed', function () {
  srStateService._resetForTests()
})

Given('the topic has {int} cards without concept_id at tiers {int}, {int}, and {int}', function (
  _count: number,
  _t1: number,
  _t2: number,
  _t3: number,
) {
  const cards: FlashCard[] = [
    makeCard({ id: 'physics-noconcept-0', tier: 1, front: 'No concept T1', back: 'A' }),
    makeCard({ id: 'physics-noconcept-1', tier: 2, front: 'No concept T2', back: 'A' }),
    makeCard({ id: 'physics-noconcept-2', tier: 3, front: 'No concept T3', back: 'A' }),
  ]

  const topic: TopicFile = {
    version: '2.0',
    slug: 'physics',
    title: 'Physics',
    generated_at: new Date().toISOString(),
    cards,
  }

  useTopicStore.setState({
    topics: { physics: topic },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })

  for (const card of cards) {
    srStateService.updateCard(card.id, makeDueSRData())
  }
})

// ─── Then ───────────────────────────────────────────────────────────────────

Then('only the T1 card appears in the session queue', function () {
  const { queue } = useReviewStore.getState()
  const t1Cards = queue.filter((c) => c.tier === 1)
  const t2Cards = queue.filter((c) => c.tier === 2)
  const t3Cards = queue.filter((c) => c.tier === 3)

  if (t1Cards.length === 0) throw new Error('Expected T1 card in queue')
  if (t2Cards.length > 0) throw new Error(`T2 card should not be in queue, found ${t2Cards.length}`)
  if (t3Cards.length > 0) throw new Error(`T3 card should not be in queue, found ${t3Cards.length}`)
})

Then('the T2 and T3 cards are not in the queue', function () {
  const { queue } = useReviewStore.getState()
  const t2Cards = queue.filter((c) => c.tier === 2)
  const t3Cards = queue.filter((c) => c.tier === 3)
  if (t2Cards.length > 0) throw new Error(`T2 cards should not be in queue, found ${t2Cards.length}`)
  if (t3Cards.length > 0) throw new Error(`T3 cards should not be in queue, found ${t3Cards.length}`)
})

Then('the T1 and T2 cards appear in the session queue', function () {
  const { queue } = useReviewStore.getState()
  const t1Cards = queue.filter((c) => c.tier === 1)
  const t2Cards = queue.filter((c) => c.tier === 2)
  if (t1Cards.length === 0) throw new Error('Expected T1 card in queue')
  if (t2Cards.length === 0) throw new Error('Expected T2 card in queue')
})

Then('the T3 card is not in the queue', function () {
  const { queue } = useReviewStore.getState()
  const t3Cards = queue.filter((c) => c.tier === 3)
  if (t3Cards.length > 0) throw new Error(`T3 card should not be in queue, found ${t3Cards.length}`)
})

Then('all {int} cards appear in the session queue', function (expected: number) {
  const { queue } = useReviewStore.getState()
  if (queue.length !== expected) {
    throw new Error(`Expected ${expected} cards in queue, got ${queue.length}`)
  }
})

Then('the T1 card appears in the session queue', function () {
  const { queue } = useReviewStore.getState()
  const t1Cards = queue.filter((c) => c.tier === 1)
  if (t1Cards.length === 0) throw new Error('Expected T1 card in queue')
})
