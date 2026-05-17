import React from 'react'
import { Given, When, Then, After } from '@cucumber/cucumber'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { srStateService } from '../../src/services/srStateService'
import { ReviewSessionPage } from '../../src/pages/ReviewSessionPage'
import type { FlashCard, TopicFile } from '../../src/types'

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

function renderReviewPage(slug: string, mode = 'review') {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[`/review/${slug}?mode=${mode}`]}>
        <Routes>
          <Route path="/review/:slug" element={<ReviewSessionPage />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

After(function () {
  cleanup()
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useReviewStore.getState().reset()
  srStateService._resetForTests()
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('I have a topic {string} with more than one card', function (slug: string) {
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
  const topic = makeTopic(slug, 3)
  useTopicStore.setState({
    topics: { [slug]: topic },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })
})

Given('I have cards across multiple topics', function () {
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
  const t1 = makeTopic('topic-a', 2)
  const t2 = makeTopic('topic-b', 2)
  useTopicStore.setState({
    topics: { 'topic-a': t1, 'topic-b': t2 },
    loading: {},
    error: {},
    sessionFetchedAt: {},
  })
})

Given('I start a review session for {string} in {string} mode', async function (slug: string, mode: string) {
  renderReviewPage(slug, mode)
  await waitFor(
    () => {
      const page = screen.queryByTestId('review-session-page')
      if (!page) throw new Error('Waiting for review session page')
    },
    { timeout: 5000 },
  )
})

Given('I start a session for slug {string}', async function (slug: string) {
  renderReviewPage(slug, 'review')
  await waitFor(
    () => {
      const page = screen.queryByTestId('review-session-page')
      if (!page) throw new Error('Waiting for review session page')
    },
    { timeout: 5000 },
  )
})

Given('I see the recall prompt', async function () {
  await waitFor(
    () => {
      const prompt = screen.queryByTestId('recall-prompt')
      if (!prompt) throw new Error('Recall prompt not visible')
    },
    { timeout: 3000 },
  )
})

// ─── When ────────────────────────────────────────────────────────────────────

When('I click the recall continue button', function () {
  const btn = screen.getByTestId('recall-continue')
  fireEvent.click(btn)
})

// ─── Then ────────────────────────────────────────────────────────────────────

Then('I should see the recall prompt', async function () {
  await waitFor(
    () => {
      const prompt = screen.queryByTestId('recall-prompt')
      if (!prompt) throw new Error('Recall prompt not visible')
    },
    { timeout: 3000 },
  )
})

Then('I should see the {string} continue button', function (label: string) {
  const btn = screen.queryByRole('button', { name: new RegExp(label, 'i') })
  if (!btn) throw new Error(`Continue button "${label}" not found`)
})

Then('I should not see the recall prompt', async function () {
  await waitFor(
    () => {
      const card = screen.queryByTestId('flash-card')
      const complete = screen.queryByTestId('session-complete')
      const exploration = screen.queryByTestId('exploration-card')
      const ready = card || complete || exploration
      if (!ready) throw new Error('Session not yet visible after dismissing recall prompt')
    },
    { timeout: 3000 },
  )
  const prompt = screen.queryByTestId('recall-prompt')
  if (prompt) throw new Error('Recall prompt is still visible')
})
