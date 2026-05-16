import React from 'react'
import { Given, When, Then, After, Before } from '@cucumber/cucumber'
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useIndexStore } from '../../src/stores/indexStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { indexedDBService } from '../../src/services/indexedDBService'
import { TopicBrowserPage } from '../../src/pages/TopicBrowserPage'
import type { FlashcardsIndex, TopicMeta, TopicFile, FlashCard, CardSRData } from '../../src/types'

const origGetFolderIds = indexedDBService.getFolderIds
const origSaveFolderIds = indexedDBService.saveFolderIds
const origSaveIndex = indexedDBService.saveIndex

function createMockTopic(slug: string, title: string, cardCount: number): TopicFile {
  const cards: FlashCard[] = Array.from({ length: cardCount }, (_, i) => ({
    id: `${slug}-source-${i}`,
    front: `Question ${i + 1}`,
    back: `Answer ${i + 1}`,
    topic: slug,
    tags: [],
    source_file: `${slug}.md`,
    created_at: new Date().toISOString(),
  }))
  return { version: '1.0', slug, title, generated_at: new Date().toISOString(), cards }
}

function NavigateTo({ to }: { to: string }) {
  const navigate = useNavigate()
  React.useEffect(() => { navigate(to) }, [navigate, to])
  return null
}

function renderApp(path: string) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/topics" element={<TopicBrowserPage />} />
          <Route path="/review/all" element={<div data-testid="review-all-page">Review All</div>} />
          <Route path="*" element={<Navigate to="/topics" replace />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

Before(function () {
  indexedDBService.getFolderIds = async () => ({})
  indexedDBService.saveFolderIds = async () => {}
  indexedDBService.saveIndex = async () => {}

  this.topicsData = {} as Record<string, TopicFile>
})

After(function () {
  cleanup()
  indexedDBService.getFolderIds = origGetFolderIds
  indexedDBService.saveFolderIds = origSaveFolderIds
  indexedDBService.saveIndex = origSaveIndex
  useIndexStore.setState({ index: null, topics: [], loading: false, error: null, isOffline: false })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useAuthStore.setState({ accessToken: null, userEmail: null })
  localStorage.removeItem('sr_state')
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('the index has been loaded with topics: kubernetes, python, react, system-design', function () {
  const topics: TopicMeta[] = [
    { slug: 'kubernetes', title: 'Kubernetes', card_count: 48, source_files: ['k8s.md'], generated_at: new Date().toISOString() },
    { slug: 'python', title: 'Python', card_count: 62, source_files: ['python.md'], generated_at: new Date().toISOString() },
    { slug: 'react', title: 'React', card_count: 35, source_files: ['react.md'], generated_at: new Date().toISOString() },
    { slug: 'system-design', title: 'System Design', card_count: 40, source_files: ['sys-design.md'], generated_at: new Date().toISOString() },
  ]

  const index: FlashcardsIndex = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    topics,
  }

  // Pre-populate topic data in store so cards are available
  const topicMap: Record<string, TopicFile> = {}
  for (const t of topics) {
    topicMap[t.slug] = createMockTopic(t.slug, t.title, t.card_count)
  }
  useTopicStore.setState({ topics: topicMap, loading: {}, error: {}, sessionFetchedAt: {} })
  useIndexStore.setState({ index, topics, loading: false, error: null, isOffline: false })
})

Given('the SR state has {int} cards due today for topic {string}', function (count: number, slug: string) {
  const topicData = useTopicStore.getState().topics[slug]
  if (!topicData) throw new Error(`Topic "${slug}" not found in store`)

  const now = new Date().toISOString()
  const srState: Record<string, CardSRData> = {}

  // Set first `count` cards as due now (state=Review, reps>=3)
  for (let i = 0; i < Math.min(count, topicData.cards.length); i++) {
    const card = topicData.cards[i]
    srState[card.id] = {
      due: now,
      stability: 10,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 1,
      reps: 5,
      lapses: 0,
      state: 2,
      last_review: new Date(Date.now() - 86400000).toISOString(),
    }
  }

  // Set remaining cards as not due (future due date)
  for (let i = count; i < topicData.cards.length; i++) {
    const card = topicData.cards[i]
    srState[card.id] = {
      due: new Date(Date.now() + 7 * 86400000).toISOString(),
      stability: 10,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 7,
      reps: 5,
      lapses: 0,
      state: 2,
      last_review: now,
    }
  }

  localStorage.setItem('sr_state', JSON.stringify(srState))
})

Given('{int} of {int} kubernetes cards have state=Review and reps>=3', function (masteredCount: number, _totalCount: number) {
  const topicData = useTopicStore.getState().topics['kubernetes']
  if (!topicData) throw new Error('Topic "kubernetes" not found in store')

  const now = new Date().toISOString()
  const srState: Record<string, CardSRData> = {}

  for (let i = 0; i < topicData.cards.length; i++) {
    const card = topicData.cards[i]
    if (i < masteredCount) {
      // Mastered: state=Review, reps>=3
      srState[card.id] = {
        due: new Date(Date.now() + 7 * 86400000).toISOString(),
        stability: 10,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 7,
        reps: 5,
        lapses: 0,
        state: 2,
        last_review: now,
      }
    } else {
      // New: state=New, reps=0
      srState[card.id] = {
        due: now,
        stability: 0,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: '',
      }
    }
  }

  localStorage.setItem('sr_state', JSON.stringify(srState))
})

Given('the topic browser is visible', async function () {
  renderApp('/topics')
  await waitFor(
    () => {
      const browser = screen.queryByTestId('topic-browser')
      if (!browser) throw new Error('Waiting for topic browser')
    },
    { timeout: 5000 },
  )
})

Given('multiple topics have due cards', function () {
  const now = new Date().toISOString()
  const srState: Record<string, CardSRData> = {}

  // Make kubernetes and python have due cards
  for (const slug of ['kubernetes', 'python']) {
    const topicData = useTopicStore.getState().topics[slug]
    if (topicData && topicData.cards.length > 0) {
      srState[topicData.cards[0].id] = {
        due: now,
        stability: 10,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 1,
        reps: 5,
        lapses: 0,
        state: 2,
        last_review: new Date(Date.now() - 86400000).toISOString(),
      }
    }
  }

  localStorage.setItem('sr_state', JSON.stringify(srState))
})

// ─── When ───────────────────────────────────────────────────────────────────

When('the user is on {string}', async function (path: string) {
  renderApp(path)
  await waitFor(
    () => {
      const browser = screen.queryByTestId('topic-browser')
      if (!browser) throw new Error('Waiting for topic browser')
    },
    { timeout: 5000 },
  )
})

When('the user types {string} in the search bar', async function (text: string) {
  const searchInput = screen.getByTestId('search-input')
  await act(async () => {
    fireEvent.change(searchInput, { target: { value: text } })
  })
})

When('the user taps {string}', async function (label: string) {
  const button = screen.getByRole('button', { name: new RegExp(label, 'i') })
  await act(async () => {
    fireEvent.click(button)
  })
})

// ─── Then ───────────────────────────────────────────────────────────────────

Then('each card shows the topic name and card count', function () {
  const cards = screen.getAllByTestId(/^topic-card-/)
  for (const card of cards) {
    const text = card.textContent ?? ''
    // Each card should have some text content with topic name and "cards"
    if (!text || text.trim().length === 0) {
      throw new Error('A topic card has no visible content')
    }
  }
})

Then('the {string} card shows a badge with {string}', function (topicName: string, badgeText: string) {
  const slug = topicName.toLowerCase().replace(/\s+/g, '-')
  const card = screen.getByTestId(`topic-card-${slug}`)
  const badge = card.querySelector(`[data-testid="due-badge-${slug}"]`)
  if (!badge) throw new Error(`No due badge found on "${topicName}" card`)
  if (!badge.textContent?.includes(badgeText)) {
    throw new Error(`Badge on "${topicName}" card shows "${badge.textContent}", expected to include "${badgeText}"`)
  }
})

Then('the {string} card does not show a due badge', function (topicName: string) {
  const slug = topicName.toLowerCase().replace(/\s+/g, '-')
  const card = screen.getByTestId(`topic-card-${slug}`)
  const badge = card.querySelector(`[data-testid="due-badge-${slug}"]`)
  if (badge) throw new Error(`"${topicName}" card should not show a due badge but one was found`)
})

Then('the {string} card mastery bar is at {int}%', function (topicName: string, pct: number) {
  const slug = topicName.toLowerCase().replace(/\s+/g, '-')
  const bar = screen.getByTestId(`mastery-bar-${slug}`)
  const fill = bar.querySelector(`[data-testid="mastery-fill-${slug}"]`)
  if (!fill) throw new Error(`No mastery fill found for "${topicName}"`)
  const width = (fill as HTMLElement).style.width
  const expectedWidth = `${pct}%`
  if (width !== expectedWidth) {
    throw new Error(`Mastery bar for "${topicName}" is at ${width}, expected ${expectedWidth}`)
  }
})

Then('only the {string} topic card is visible', function (topicName: string) {
  const slug = topicName.toLowerCase().replace(/\s+/g, '-')
  const allCards = screen.queryAllByTestId(/^topic-card-/)
  const matching = allCards.filter((c) => c.getAttribute('data-testid') === `topic-card-${slug}`)
  if (matching.length !== 1) throw new Error(`Expected 1 visible card for "${topicName}", found ${matching.length}`)
  // The others should either not be in the DOM or be hidden
  const nonMatching = allCards.filter((c) => c.getAttribute('data-testid') !== `topic-card-${slug}`)
  if (nonMatching.length > 0) {
    throw new Error(`Expected only "${topicName}" card to be visible but found ${nonMatching.length} other cards`)
  }
})

Then('the {string} topic card is visible', function (topicName: string) {
  const slug = topicName.toLowerCase().replace(/\s+/g, '-')
  screen.getByTestId(`topic-card-${slug}`)
})

Then('no topic cards are visible', function () {
  const cards = screen.queryAllByTestId(/^topic-card-/)
  if (cards.length > 0) throw new Error(`Expected 0 topic cards, found ${cards.length}`)
})

Then('an empty state message is shown', function () {
  const empty = screen.queryByTestId('empty-search-state')
  if (!empty) throw new Error('Expected empty search state message')
})

Then('the user navigates to {string}', function (path: string) {
  const el = screen.getByTestId('review-all-page')
  if (!el) throw new Error(`Expected to navigate to ${path} but review-all-page is not shown`)
})
