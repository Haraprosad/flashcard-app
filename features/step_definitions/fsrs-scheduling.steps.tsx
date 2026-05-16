import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { fsrsService } from '../../src/services/fsrsService'
import { srStateService } from '../../src/services/srStateService'
import { useReviewStore } from '../../src/stores/reviewStore'
import type { FlashCard, CardSRData } from '../../src/types'

function makeCard(overrides: Partial<FlashCard> = {}): FlashCard {
  return {
    id: 'test-card-0',
    front: 'What is Kubernetes?',
    back: 'Container orchestration platform',
    topic: 'kubernetes',
    tags: [],
    source_file: 'kubernetes.md',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeSRData(overrides: Partial<CardSRData> = {}): CardSRData {
  return {
    due: new Date().toISOString(),
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    last_review: new Date(Date.now() - 86400000).toISOString(),
    ...overrides,
  }
}

Before(function () {
  localStorage.clear()
})

After(function () {
  localStorage.clear()
  useReviewStore.getState().reset()
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('a card with state=New \\(never reviewed)', function () {
  this.card = makeCard()
  this.srData = null
})

Given('a card with state=New', function () {
  this.card = makeCard()
  this.srData = null
})

Given('a card with state=Review and stability={float}', function (stability: number) {
  this.card = makeCard()
  this.srData = makeSRData({ stability, state: 2, reps: 5, lapses: 0 })
})

Given('a card is being reviewed in a session', function () {
  this.card = makeCard()
  this.srData = null
  srStateService.updateCard(this.card.id, makeSRData({ state: 0, reps: 0 }))
})

Given('the user has reviewed cards in a session', function () {
  const card = makeCard({ id: 'session-card-0' })
  const srData = makeSRData({ state: 2, reps: 3 })
  srStateService.updateCard(card.id, srData)
})

Given('a card with id {string} is in SR state', function (cardId: string) {
  srStateService.updateCard(cardId, makeSRData({ state: 2, reps: 5 }))
})

// ─── When ───────────────────────────────────────────────────────────────────

When('the fsrs service rates that card as {string}', function (rating: string) {
  this.result = fsrsService.rateCard(this.card, this.srData, rating as 'Good' | 'Again' | 'Hard' | 'Easy')
})

When('the fsrs service rates that card as {string} and records the interval', function (rating: string) {
  const result = fsrsService.rateCard(this.card, this.srData, rating as 'Good' | 'Again' | 'Hard' | 'Easy')
  this.goodDue = new Date(result.due)
})

When('the fsrs service rates that card as {string} from New state', function (rating: string) {
  this.card2 = makeCard({ id: 'test-card-1' })
  this.result2 = fsrsService.rateCard(this.card2, null, rating as 'Good' | 'Again' | 'Hard' | 'Easy')
})

When('any rating is applied to the card', function () {
  const result = fsrsService.rateCard(this.card, null, 'Good')
  srStateService.updateCard(this.card.id, result)
})

When('the review store is re-initialized', function () {
  useReviewStore.getState().reset()
})

// ─── Then ───────────────────────────────────────────────────────────────────

Then("the card's state is no longer New", function () {
  const result = this.result as CardSRData
  if (result.state === 0) throw new Error('Card is still in New state after rating')
})

Then('the next review is scheduled in the future', function () {
  const result = this.result as CardSRData
  const due = new Date(result.due)
  const now = new Date()
  if (due <= now) throw new Error(`Due date ${due.toISOString()} is not in the future`)
})

Then('the Easy interval is greater than or equal to the Good interval', function () {
  const goodDue = this.goodDue as Date
  const easyResult = this.result2 as CardSRData
  const easyDue = new Date(easyResult.due)
  if (easyDue < goodDue) {
    throw new Error(
      `Easy interval (${easyDue.toISOString()}) is shorter than Good interval (${goodDue.toISOString()})`,
    )
  }
})

Then("the card's state changes to Relearning", function () {
  const result = this.result as CardSRData
  if (result.state !== 3) {
    throw new Error(`Expected state=Relearning(3), got state=${result.state}`)
  }
})

Then('the lapses count increases by 1', function () {
  const result = this.result as CardSRData
  const originalLapses = (this.srData as CardSRData)?.lapses ?? 0
  if (result.lapses !== originalLapses + 1) {
    throw new Error(`Expected lapses=${originalLapses + 1}, got ${result.lapses}`)
  }
})

Then('the new stability is greater than {float}', function (threshold: number) {
  const result = this.result as CardSRData
  if (result.stability <= threshold) {
    throw new Error(`Expected stability > ${threshold}, got ${result.stability}`)
  }
})

Then('localStorage sr_state is updated synchronously', function () {
  const raw = localStorage.getItem('sr_state')
  if (!raw) throw new Error('sr_state not found in localStorage')
  const state = JSON.parse(raw) as Record<string, unknown>
  if (!state[(this.card as FlashCard).id]) {
    throw new Error(`sr_state does not contain card id "${(this.card as FlashCard).id}"`)
  }
})

Then('the SR state from localStorage is still present', function () {
  const raw = localStorage.getItem('sr_state')
  if (!raw) throw new Error('sr_state was lost from localStorage')
  const state = JSON.parse(raw) as Record<string, unknown>
  if (Object.keys(state).length === 0) {
    throw new Error('sr_state in localStorage is empty after store reset')
  }
})

Then('the SR state entry for {string} is preserved', function (cardId: string) {
  const raw = localStorage.getItem('sr_state')
  if (!raw) throw new Error('sr_state not found in localStorage')
  const state = JSON.parse(raw) as Record<string, unknown>
  if (!state[cardId]) {
    throw new Error(`SR state for card "${cardId}" was not found in localStorage`)
  }
})
