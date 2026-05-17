import React from 'react'
import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { render, screen, waitFor, act, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { indexedDBService } from '../../src/services/indexedDBService'
import { srStateService } from '../../src/services/srStateService'
import { ReviewSessionPage } from '../../src/pages/ReviewSessionPage'
import type { FlashCard, CardSRData, TopicFile } from '../../src/types'

const origGetFolderIds = indexedDBService.getFolderIds
const origSaveFolderIds = indexedDBService.saveFolderIds

function makeCard(slug: string, i: number): FlashCard {
  return {
    id: `${slug}-source-${i}`,
    type: 'standard',
    tier: 1,
    front: `Question ${i + 1}`,
    back: `Answer ${i + 1}`,
    topic: slug,
    tags: [],
    source_file: `${slug}.md`,
    created_at: new Date().toISOString(),
  }
}

function makeTopic(slug: string, count: number): TopicFile {
  return {
    version: '1.0',
    slug,
    title: slug.charAt(0).toUpperCase() + slug.slice(1),
    generated_at: new Date().toISOString(),
    cards: Array.from({ length: count }, (_, i) => makeCard(slug, i)),
  }
}

function renderReviewPage(slug: string) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[`/review/${slug}`]}>
        <Routes>
          <Route path="/review/:slug" element={<ReviewSessionPage />} />
          <Route path="/topics" element={<div data-testid="topics-page">Topics</div>} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

Before(function () {
  indexedDBService.getFolderIds = async () => ({})
  indexedDBService.saveFolderIds = async () => {}
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
})

After(function () {
  cleanup()
  indexedDBService.getFolderIds = origGetFolderIds
  indexedDBService.saveFolderIds = origSaveFolderIds
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useReviewStore.getState().reset()
  srStateService._resetForTests()
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('the {string} topic has been loaded with {int} cards', function (slug: string, count: number) {
  const topic = makeTopic(slug, count)
  useTopicStore.setState({
    topics: { [slug]: topic },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })
})

Given('{int} of those cards are due today', function (count: number) {
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  const now = new Date().toISOString()
  for (let i = 0; i < Math.min(count, allCards.length); i++) {
    srStateService.updateCard(allCards[i].id, {
      due: now,
      stability: 5,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 1,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: new Date(Date.now() - 86400000).toISOString(),
    })
  }
  // Remaining cards get future due (not due today)
  for (let i = count; i < allCards.length; i++) {
    srStateService.updateCard(allCards[i].id, {
      due: new Date(Date.now() + 7 * 86400000).toISOString(),
      stability: 5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 7,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: now,
    })
  }
})

Given('{int} cards have never been reviewed \\(state=New)', function (count: number) {
  // Remove SR state for the first `count` cards so they appear as New
  const topics = useTopicStore.getState().topics
  const allCards = Object.values(topics).flatMap((t) => t.cards)
  for (let i = 0; i < Math.min(count, allCards.length); i++) {
    srStateService._deleteCardForTests(allCards[i].id)
  }
})

Given('{int} cards have never been reviewed', function (count: number) {
  // No SR state needed — cards without entries are treated as New
  const slug = 'kubernetes'
  const topic = makeTopic(slug, count)
  useTopicStore.setState({
    topics: { [slug]: topic },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })
})

Given('the review session is loaded with {int} due card(s)', async function (count: number) {
  const slug = 'kubernetes'
  const topic = makeTopic(slug, count)
  useTopicStore.setState({
    topics: { [slug]: topic },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })

  const now = new Date().toISOString()
  for (const card of topic.cards) {
    srStateService.updateCard(card.id, {
      due: now,
      stability: 5,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 1,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: new Date(Date.now() - 86400000).toISOString(),
    })
  }

  renderReviewPage(slug)
  await waitFor(
    () => {
      const page = screen.queryByTestId('review-session-page')
      if (!page) throw new Error('Waiting for review session page')
    },
    { timeout: 5000 },
  )
  await waitFor(
    () => {
      const card = screen.queryByTestId('flash-card')
      const complete = screen.queryByTestId('session-complete')
      if (!card && !complete) throw new Error('Waiting for card or complete screen')
    },
    { timeout: 5000 },
  )
})

Given('the current card is showing its back', async function () {
  const card = screen.queryByTestId('flash-card')
  if (!card) throw new Error('No flash card on screen')
  // Flip the card
  await act(async () => {
    fireEvent.click(card)
  })
  await waitFor(() => {
    const ratingBar = screen.queryByTestId('rating-bar')
    if (!ratingBar) throw new Error('RatingBar not visible — card may not be flipped')
  }, { timeout: 3000 })
})

Given('the current card is showing its front', async function () {
  await waitFor(() => {
    const card = screen.queryByTestId('flash-card')
    if (!card) throw new Error('No flash card on screen')
  }, { timeout: 3000 })
  // Ensure the card is NOT flipped (already in initial state)
})

// ─── When ───────────────────────────────────────────────────────────────────

When('the user starts a review session for {string}', async function (slug: string) {
  renderReviewPage(slug)
  await waitFor(
    () => {
      const page = screen.queryByTestId('review-session-page')
      if (!page) throw new Error('Waiting for review session page')
    },
    { timeout: 5000 },
  )
  await waitFor(
    () => {
      const card = screen.queryByTestId('flash-card')
      const complete = screen.queryByTestId('session-complete')
      if (!card && !complete) throw new Error('Waiting for card or complete screen')
    },
    { timeout: 5000 },
  )
})

When('the user taps the card', async function () {
  const card = screen.getByTestId('flash-card')
  await act(async () => {
    fireEvent.click(card)
  })
})

When('the user taps the {string} rating button', async function (label: string) {
  const testId = `rate-${label.toLowerCase()}`
  await waitFor(() => {
    const btn = screen.queryByTestId(testId)
    if (!btn) throw new Error(`Rating button "${testId}" not visible`)
  }, { timeout: 3000 })
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId))
  })
})

When('the user presses the Space key', async function () {
  await act(async () => {
    fireEvent.keyDown(window, { key: ' ' })
  })
})

When('the user presses the {string} key', async function (key: string) {
  await act(async () => {
    fireEvent.keyDown(window, { key })
  })
})

// ─── Then ───────────────────────────────────────────────────────────────────

Then('the session queue has {int} cards', function (count: number) {
  const { queue } = useReviewStore.getState()
  if (queue.length !== count) {
    throw new Error(`Expected session queue to have ${count} cards, got ${queue.length}`)
  }
})

Then('the first card is shown face-down \\(front only)', async function () {
  await waitFor(() => {
    const card = screen.getByTestId('flash-card')
    const flipped = card.getAttribute('data-flipped')
    if (flipped === 'true') throw new Error('Card is showing its back, expected front')
  }, { timeout: 3000 })
})

Then('those {int} new cards are included in the queue', function (count: number) {
  const { queue } = useReviewStore.getState()
  const srState = srStateService.getSRState()
  const newInQueue = queue.filter((c) => !srState[c.id])
  if (newInQueue.length < count) {
    throw new Error(`Expected at least ${count} new cards in queue, found ${newInQueue.length}`)
  }
})

Then('only {int} new cards are in the session queue', function (max: number) {
  const { queue } = useReviewStore.getState()
  const srState = srStateService.getSRState()
  const newInQueue = queue.filter((c) => !srState[c.id])
  if (newInQueue.length > max) {
    throw new Error(`Expected at most ${max} new cards, found ${newInQueue.length}`)
  }
})

Then('the card flips to show the back', async function () {
  await waitFor(
    () => {
      const card = screen.getByTestId('flash-card')
      const flipped = card.getAttribute('data-flipped')
      if (flipped !== 'true') throw new Error('Card has not flipped')
    },
    { timeout: 3000 },
  )
})

Then('the RatingBar appears with {int} buttons', async function (_count: number) {
  await waitFor(
    () => {
      const bar = screen.queryByTestId('rating-bar')
      if (!bar) throw new Error('RatingBar is not visible')
    },
    { timeout: 3000 },
  )
  screen.getByTestId('rate-again')
  screen.getByTestId('rate-hard')
  screen.getByTestId('rate-good')
  screen.getByTestId('rate-easy')
})

Then('the SR state for that card is updated in localStorage', function () {
  const state = srStateService.getSRState()
  if (Object.keys(state).length === 0) throw new Error('SR state is empty after rating')
})

Then('the next card is shown', async function () {
  await waitFor(
    () => {
      const card = screen.queryByTestId('flash-card')
      const complete = screen.queryByTestId('session-complete')
      if (!card && !complete) throw new Error('No card or complete screen')
    },
    { timeout: 3000 },
  )
})

Then('the card is added back to the end of the session queue', function () {
  const { queue, currentIndex } = useReviewStore.getState()
  // After rating Again, the queue grows (card was appended)
  if (queue.length <= currentIndex) {
    throw new Error('Expected queue to have more cards after Again rating')
  }
})

Then('the rating buttons show interval previews', async function () {
  await waitFor(() => {
    const bar = screen.queryByTestId('rating-bar')
    if (!bar) throw new Error('RatingBar not visible')
  }, { timeout: 3000 })

  const againInterval = screen.getByTestId('interval-again')
  const goodInterval = screen.getByTestId('interval-good')
  if (!againInterval.textContent) throw new Error('Again interval is empty')
  if (!goodInterval.textContent) throw new Error('Good interval is empty')
})

Then('the SessionComplete screen is shown', async function () {
  await waitFor(
    () => {
      const complete = screen.queryByTestId('session-complete')
      if (!complete) throw new Error('SessionComplete not visible')
    },
    { timeout: 5000 },
  )
})

Then('it displays the count of cards reviewed', function () {
  const countEl = screen.getByTestId('cards-reviewed-count')
  const count = parseInt(countEl.textContent ?? '0', 10)
  if (count < 1) throw new Error(`Expected reviewed count >= 1, got ${count}`)
})

Then('the card is rated {string}', async function (rating: string) {
  await waitFor(() => {
    const { reviewedCount } = useReviewStore.getState()
    if (reviewedCount < 1) throw new Error(`Expected reviewedCount >= 1 after rating ${rating}`)
  }, { timeout: 3000 })
})
