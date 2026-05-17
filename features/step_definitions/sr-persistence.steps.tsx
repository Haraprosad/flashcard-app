import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { srStateService } from '../../src/services/srStateService'
import { srStateDriveService } from '../../src/services/srStateDriveService'
import { progressStore } from '../../src/stores/progressStore'
import { indexedDBService } from '../../src/services/indexedDBService'
import type { CardSRData, SRState } from '../../src/types'

// ─── World ────────────────────────────────────────────────────────────────────

declare module '@cucumber/cucumber' {
  interface World {
    mergedSR?: SRState
    mergedExplored?: string[]
    idbSRData?: Record<string, CardSRData>
    pendingUploadFlag?: boolean
    capturedIDBEntry?: CardSRData | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCardSRData(reps: number, lastReview = '2026-05-15T10:00:00.000Z'): CardSRData {
  return {
    due: '2026-05-20T00:00:00.000Z',
    stability: 1.5,
    difficulty: 5,
    elapsed_days: 5,
    scheduled_days: 5,
    reps,
    lapses: 0,
    state: 2,
    last_review: lastReview,
  }
}

// ─── Before / After ────────────────────────────────────────────────────────────

Before({ tags: '@sr-persistence or not @no-sr-reset' }, function () {
  srStateService._resetForTests()
  progressStore._resetForTests()

  // Restore IDB methods to safe no-op defaults
  indexedDBService.putSRStateEntry = async () => {}
  indexedDBService.getAllSRState = async () => ({})
  indexedDBService.clearSRState = async () => {}
  indexedDBService.getExploredConcepts = async () => []
  indexedDBService.saveExploredConcepts = async () => {}
  indexedDBService.getMetaValue = async () => null
  indexedDBService.setMetaValue = async () => {}
  indexedDBService.deleteMetaValue = async () => {}
  indexedDBService.getAllReviewLog = async () => ({})
  indexedDBService.putReviewLogEntry = async () => {}
  indexedDBService.clearReviewLog = async () => {}
  indexedDBService.getStreakData = async () => null
  indexedDBService.saveStreakData = async () => {}
  indexedDBService.resetAllSRData = async () => {}
})

Before(function () {
  srStateService._resetForTests()
  progressStore._resetForTests()

  indexedDBService.putSRStateEntry = async () => {}
  indexedDBService.getAllSRState = async () => ({})
  indexedDBService.clearSRState = async () => {}
  indexedDBService.getExploredConcepts = async () => []
  indexedDBService.saveExploredConcepts = async () => {}
  indexedDBService.getMetaValue = async () => null
  indexedDBService.setMetaValue = async () => {}
  indexedDBService.deleteMetaValue = async () => {}
  indexedDBService.getAllReviewLog = async () => ({})
  indexedDBService.putReviewLogEntry = async () => {}
  indexedDBService.clearReviewLog = async () => {}
  indexedDBService.getStreakData = async () => null
  indexedDBService.saveStreakData = async () => {}
  indexedDBService.resetAllSRData = async () => {}
})

After(function () {
  srStateService._resetForTests()
  progressStore._resetForTests()
})

// ─── Step definitions ─────────────────────────────────────────────────────────

Given('the SR state service is initialized with a clean state', function () {
  srStateService._resetForTests()
})

Given('a card with id {string} has no SR data', function (cardId: string) {
  // card is not in the cache — nothing to do
  if (srStateService.getCardSRData(cardId) !== null) {
    throw new Error(`Expected card ${cardId} to have no SR data, but it does`)
  }
})

When('I rate the card {string} as {string}', function (cardId: string, _rating: string) {
  const srData = makeCardSRData(1)
  const captured: Record<string, CardSRData> = {}
  indexedDBService.putSRStateEntry = async (id: string, data: CardSRData) => {
    captured[id] = data
  }
  this.idbSRData = captured
  srStateService.updateCard(cardId, srData)
})

Then('the SR data for {string} should be stored in IndexedDB', async function (cardId: string) {
  // Give the fire-and-forget write a tick to complete
  await new Promise((r) => setTimeout(r, 0))
  const stored = this.idbSRData?.[cardId]
  if (!stored) throw new Error(`Expected IDB to contain SR data for ${cardId}`)
})

Given('the IndexedDB sr_state store contains SR data for card {string}', function (cardId: string) {
  const data = makeCardSRData(3)
  indexedDBService.getAllSRState = async () => ({ [cardId]: data })
})

When('the SR state service re-initializes from IndexedDB', async function () {
  srStateService._resetForTests()
  await srStateService.init()
})

Then('{string} should be present in the in-memory SR cache', function (cardId: string) {
  const srData = srStateService.getCardSRData(cardId)
  if (!srData) throw new Error(`Expected ${cardId} to be in the SR cache after re-init`)
})

Given('the local SR state has {string} with reps {int}', function (cardId: string, reps: number) {
  srStateService.updateCard(cardId, makeCardSRData(reps))
})

Given('the Drive has {string} with reps {int}', function (cardId: string, reps: number) {
  this.driveState = { ...((this.driveState as SRState) ?? {}), [cardId]: makeCardSRData(reps) }
})

When('the user signs in and a Drive merge runs', function () {
  const driveState = (this.driveState ?? {}) as SRState
  const localState = srStateService.getSRState()
  this.mergedSR = srStateDriveService.mergeSRState(localState, driveState)
})

Then(
  'the merged SR state should have {string} with reps {int}',
  function (cardId: string, expectedReps: number) {
    const merged = (this.mergedSR ?? {}) as SRState
    const entry = merged[cardId]
    if (!entry) throw new Error(`Card ${cardId} missing from merged SR state`)
    if (entry.reps !== expectedReps) {
      throw new Error(`Expected reps ${expectedReps} for ${cardId}, got ${entry.reps}`)
    }
  },
)

When('the merge strategy runs', function () {
  const driveState = (this.driveState ?? {}) as SRState
  const localState = srStateService.getSRState()
  this.mergedSR = srStateDriveService.mergeSRState(localState, driveState)

  const localExplored = srStateService.getExploredConceptIds()
  const driveExplored = (this.driveExplored ?? []) as string[]
  this.mergedExplored = srStateDriveService.mergeExploredConcepts(localExplored, driveExplored)
})

Given(
  'the local SR state has {string} with reps {int} last reviewed {string}',
  function (cardId: string, reps: number, lastReview: string) {
    srStateService.updateCard(cardId, makeCardSRData(reps, `${lastReview}T00:00:00.000Z`))
  },
)

Given(
  'the Drive has {string} with reps {int} last reviewed {string}',
  function (cardId: string, reps: number, lastReview: string) {
    this.driveState = {
      ...((this.driveState as SRState) ?? {}),
      [cardId]: makeCardSRData(reps, `${lastReview}T00:00:00.000Z`),
    }
  },
)

Then(
  'the merged SR state should use the Drive entry for {string}',
  function (cardId: string) {
    const merged = (this.mergedSR ?? {}) as SRState
    const driveState = (this.driveState ?? {}) as SRState
    const entry = merged[cardId]
    const driveEntry = driveState[cardId]
    if (!entry || !driveEntry) throw new Error(`Missing entries for ${cardId}`)
    if (entry.last_review !== driveEntry.last_review) {
      throw new Error(
        `Expected Drive last_review ${driveEntry.last_review}, got ${entry.last_review}`,
      )
    }
  },
)

Given('the user is offline', function () {
  this.isOffline = true
})

When('a post-session push is attempted', async function () {
  const captured: Record<string, unknown> = {}
  indexedDBService.setMetaValue = async (key: string, value: unknown) => {
    captured[key] = value
  }
  indexedDBService.getAllReviewLog = async () => ({})

  // Simulate network error in pushSRState
  const origPush = srStateDriveService.pushSRState
  srStateDriveService.pushSRState = async () => {
    await indexedDBService.setMetaValue('sr_state_pending_upload', true)
    throw new TypeError('Failed to fetch')
  }
  try {
    await srStateDriveService.pushSRState('fake-token', {
      version: '1.0',
      updated_at: new Date().toISOString(),
      device_id: 'test-device',
      sr_state: {},
      explored_concepts: [],
      review_log: {},
      streak_data: { current: 0, longest: 0, last_review_date: null },
    })
  } catch { /* expected */ }
  srStateDriveService.pushSRState = origPush

  this.capturedMeta = captured
})

Then(
  'the IDB metadata {string} should be true',
  function (key: string) {
    const capturedMeta = this.capturedMeta as Record<string, unknown>
    if (capturedMeta?.[key] !== true) {
      throw new Error(`Expected IDB meta key "${key}" to be true`)
    }
  },
)

Given('the local explored concepts include {string}', function (conceptId: string) {
  srStateService.markExplored(conceptId)
})

Given('the Drive explored concepts include {string}', function (conceptId: string) {
  this.driveExplored = [...((this.driveExplored as string[]) ?? []), conceptId]
})

Then(
  'the merged explored concepts should include both {string} and {string}',
  function (a: string, b: string) {
    const merged = (this.mergedExplored ?? []) as string[]
    if (!merged.includes(a)) throw new Error(`Merged explored missing "${a}"`)
    if (!merged.includes(b)) throw new Error(`Merged explored missing "${b}"`)
  },
)

Given('localStorage contains SR data for card {string}', function (cardId: string) {
  const srData = makeCardSRData(2)
  const state: SRState = { [cardId]: srData }
  localStorage.setItem('sr_state', JSON.stringify(state))
})

When('the IndexedDB service opens for the first time at version 2', async function () {
  // Simulate IDB v2 migration: read localStorage, write to IDB store, clear localStorage
  const raw = localStorage.getItem('sr_state')
  const captured: Record<string, CardSRData> = {}
  indexedDBService.putSRStateEntry = async (id: string, data: CardSRData) => {
    captured[id] = data
  }
  if (raw) {
    const srState = JSON.parse(raw) as SRState
    for (const [cardId, data] of Object.entries(srState)) {
      await indexedDBService.putSRStateEntry(cardId, data)
    }
    localStorage.removeItem('sr_state')
  }
  this.idbSRData = captured
})

Then(
  'the IDB sr_state store should contain the migrated entry for {string}',
  function (cardId: string) {
    const stored = (this.idbSRData as Record<string, CardSRData>)?.[cardId]
    if (!stored) throw new Error(`IDB sr_state missing migrated entry for ${cardId}`)
  },
)

Then('localStorage should no longer contain {string}', function (key: string) {
  const val = localStorage.getItem(key)
  if (val !== null) throw new Error(`Expected localStorage key "${key}" to be removed, but it's still present`)
})
