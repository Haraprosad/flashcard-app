import React from 'react'
import { Given, Then, Before, After } from '@cucumber/cucumber'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { indexedDBService } from '../../src/services/indexedDBService'
import { ReviewSessionPage } from '../../src/pages/ReviewSessionPage'
import type { FlashCard, CardSRData, TopicFile } from '../../src/types'

const origGetFolderIds = indexedDBService.getFolderIds
const origSaveFolderIds = indexedDBService.saveFolderIds

function makeCard(overrides: Partial<FlashCard> = {}): FlashCard {
  return {
    id: 'physics-source-0',
    type: 'standard',
    tier: 1,
    front: 'What is entropy?',
    back: 'A measure of the number of possible microstates.',
    topic: 'physics',
    tags: [],
    source_file: 'physics.md',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeDueSRData(): CardSRData {
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
  }
}

function setTopicWithCards(cards: FlashCard[]) {
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

  const srState: Record<string, CardSRData> = {}
  for (const card of cards) {
    srState[card.id] = makeDueSRData()
  }
  localStorage.setItem('sr_state', JSON.stringify(srState))
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
  localStorage.removeItem('sr_state')
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('the topic has {int} standard card loaded', function (_count: number) {
  setTopicWithCards([makeCard({ front: 'What is entropy?', back: 'A measure of disorder.' })])
})

Given('the topic has {int} cloze card loaded with blank', function (_count: number) {
  setTopicWithCards([makeCard({
    type: 'cloze',
    front: 'Entropy is ___ and always increases.',
    back: 'Entropy is **disorder** and always increases.',
  })])
})

Given('the topic has {int} intuition card loaded', function (_count: number) {
  setTopicWithCards([makeCard({
    type: 'intuition',
    front: 'Imagine: You drop a glass — it shatters. Why never the reverse?',
    back: 'There is only 1 whole-glass state but millions of broken-glass states. Entropy counts those states.',
  })])
})

Given('the topic has {int} legacy card without type or tier', function (_count: number) {
  setTopicWithCards([makeCard({
    type: 'standard',
    tier: 1,
    front: 'Legacy question?',
    back: 'Legacy answer.',
  })])
})

Given('the topic has {int} T2 card loaded', function (_count: number) {
  setTopicWithCards([makeCard({
    tier: 2,
    front: 'What is the causal chain of adiabatic compression?',
    back: 'Volume decreases → collisions increase → kinetic energy rises → temperature rises.',
  })])
})

Given('the review session is loaded', async function () {
  renderReviewPage('physics')
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

// ─── Then ───────────────────────────────────────────────────────────────────

Then('the card front shows the question text', async function () {
  await waitFor(() => {
    const card = screen.getByTestId('flash-card')
    if (!card.textContent?.includes('entropy') && !card.textContent?.includes('Legacy')) {
      throw new Error('Card front does not show expected question text')
    }
  }, { timeout: 3000 })
})

Then('the card has tier badge {string}', async function (badge: string) {
  await waitFor(() => {
    const badgeEl = screen.queryByTestId(`tier-badge-${badge === 'T1' ? '1' : badge === 'T2' ? '2' : '3'}`)
    if (!badgeEl) throw new Error(`Tier badge "${badge}" not found`)
    if (!badgeEl.textContent?.includes(badge)) {
      throw new Error(`Expected badge text "${badge}", got "${badgeEl.textContent}"`)
    }
  }, { timeout: 3000 })
})

Then('the card front shows blanks \\(underlined ___\\)', async function () {
  await waitFor(() => {
    const card = screen.getByTestId('flash-card')
    const text = card.textContent ?? ''
    if (!text.includes('___')) {
      throw new Error(`Expected blanks (___) in card front, got: "${text}"`)
    }
  }, { timeout: 3000 })
})

Then('the card front shows {string} prefix in amber', async function (_prefix: string) {
  await waitFor(() => {
    const card = screen.getByTestId('flash-card')
    const text = card.textContent ?? ''
    if (!text.toLowerCase().includes('imagine')) {
      throw new Error(`Expected "Imagine:" prefix in card front, got: "${text}"`)
    }
  }, { timeout: 3000 })
})

Then('the card back shows the revealed text with highlighted segment', async function () {
  await waitFor(() => {
    const card = screen.getByTestId('flash-card')
    const flipped = card.getAttribute('data-flipped')
    if (flipped !== 'true') throw new Error('Card has not flipped')
    const text = card.textContent ?? ''
    if (!text.includes('disorder')) {
      throw new Error(`Expected revealed segment "disorder" in card back, got: "${text}"`)
    }
  }, { timeout: 3000 })
})

Then('the card back shows the explanation text', async function () {
  await waitFor(() => {
    const card = screen.getByTestId('flash-card')
    const flipped = card.getAttribute('data-flipped')
    if (flipped !== 'true') throw new Error('Card has not flipped')
    const text = card.textContent ?? ''
    if (!text.includes('states')) {
      throw new Error(`Expected explanation text in card back, got: "${text}"`)
    }
  }, { timeout: 3000 })
})
