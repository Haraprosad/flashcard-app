import React from 'react'
import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useIndexStore } from '../../src/stores/indexStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { indexedDBService } from '../../src/services/indexedDBService'
import { gdriveService } from '../../src/services/gdriveService'
import { TopicBrowserPage } from '../../src/pages/TopicBrowserPage'
import { ReviewSessionPage } from '../../src/pages/ReviewSessionPage'
import { TopicDetailPage } from '../../src/pages/TopicDetailPage'
import type { FlashCard, TopicFile, FlashcardsIndex } from '../../src/types'

// ─── Saved originals ─────────────────────────────────────────────────────────

const origFetch = globalThis.fetch
const origGetIndex = indexedDBService.getIndex
const origSaveIndex = indexedDBService.saveIndex
const origGetTopicFile = indexedDBService.getTopicFile
const origSaveTopicFile = indexedDBService.saveTopicFile
const origGetTopicFetchedAt = indexedDBService.getTopicFetchedAt
const origGetFolderIds = indexedDBService.getFolderIds
const origSaveFolderIds = indexedDBService.saveFolderIds
// Save the real fetchTopicFile before topic-lazy-load's Before hook replaces it per-scenario
const origFetchTopicFile = gdriveService.fetchTopicFile

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(slug: string, i: number): FlashCard {
  return {
    id: `${slug}-source-${i}`,
    front: `Question ${i + 1}`,
    back: `Answer ${i + 1}`,
    topic: slug,
    tags: [],
    source_file: `${slug}.md`,
    created_at: new Date().toISOString(),
  }
}

function makeTopic(slug: string, count = 5): TopicFile {
  return {
    version: '1.0',
    slug,
    title: slug.charAt(0).toUpperCase() + slug.slice(1),
    generated_at: new Date(Date.now() - 7200000).toISOString(), // 2h ago
    cards: Array.from({ length: count }, (_, i) => makeCard(slug, i)),
  }
}

function makeCachedIndex(slugs: string[]): FlashcardsIndex {
  const genAt = new Date(Date.now() - 7200000).toISOString()
  return {
    version: '1.0',
    generated_at: genAt,
    topics: slugs.map((slug) => ({
      slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      card_count: 5,
      source_files: [`${slug}.md`],
      generated_at: genAt,
    })),
  }
}

function renderTopicBrowser() {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={['/topics']}>
        <Routes>
          <Route path="/topics" element={<TopicBrowserPage />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

function renderTopicDetailPage(slug: string) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[`/topics/${slug}`]}>
        <Routes>
          <Route path="/topics/:slug" element={<TopicDetailPage />} />
          <Route path="*" element={<Navigate to={`/topics/${slug}`} replace />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

function renderReviewPage(slug: string) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[`/review/${slug}`]}>
        <Routes>
          <Route path="/review/:slug" element={<ReviewSessionPage />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

// ─── Before / After ──────────────────────────────────────────────────────────

Before(function () {
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
  indexedDBService.getFolderIds = async () => ({})
  indexedDBService.saveFolderIds = async () => {}
  indexedDBService.saveIndex = async () => {}
  indexedDBService.saveTopicFile = async () => {}
  // Default: IDB has no cached index (individual scenarios override as needed)
  indexedDBService.getIndex = async () => null
  // Set a past last_synced_at for "time since last sync" assertions
  localStorage.setItem('last_synced_at', new Date(Date.now() - 3600000).toISOString())
})

After(function () {
  cleanup()
  globalThis.fetch = origFetch
  gdriveService.fetchTopicFile = origFetchTopicFile
  indexedDBService.getIndex = origGetIndex
  indexedDBService.saveIndex = origSaveIndex
  indexedDBService.getTopicFile = origGetTopicFile
  indexedDBService.saveTopicFile = origSaveTopicFile
  indexedDBService.getTopicFetchedAt = origGetTopicFetchedAt
  indexedDBService.getFolderIds = origGetFolderIds
  indexedDBService.saveFolderIds = origSaveFolderIds
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useIndexStore.setState({ index: null, topics: [], loading: false, error: null, isOffline: false })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useReviewStore.getState().reset()
  localStorage.removeItem('sr_state')
  localStorage.removeItem('last_synced_at')
  try {
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    })
  } catch { /* ignore */ }
})

// ─── Given ───────────────────────────────────────────────────────────────────

Given('the user has previously loaded the {string} topic', function (slug: string) {
  const topic = makeTopic(slug)
  const genAt = topic.generated_at
  const now = new Date().toISOString()

  useTopicStore.setState({
    topics: { [slug]: topic },
    loading: {},
    error: {},
    sessionFetchedAt: { [slug]: now },
  })

  const index = makeCachedIndex([slug])
  index.topics[0].generated_at = genAt
  useIndexStore.setState({
    index,
    topics: index.topics,
    loading: false,
    error: null,
    isOffline: false,
  })
  this.mockTopic = topic
})

Given('IndexedDB contains the {word} topic cards', function (slug: string) {
  const topic = (this.mockTopic as TopicFile | undefined) ?? makeTopic(slug)
  indexedDBService.getTopicFile = async (s: string) => (s === slug ? topic : null)
  indexedDBService.getTopicFetchedAt = async () => new Date().toISOString()
})

Given('SR state is in localStorage', function () {
  localStorage.setItem('sr_state', JSON.stringify({}))
})

Given(/^the device (?:goes |is )offline$/, function () {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  try {
    Object.defineProperty(global.navigator, 'onLine', {
      value: false,
      configurable: true,
      writable: true,
    })
  } catch { /* ignore */ }
})

Given('all topics have been cached in IndexedDB', function () {
  const cachedIndex = makeCachedIndex(['kubernetes', 'python'])
  indexedDBService.getIndex = async () => cachedIndex
  this.cachedIndex = cachedIndex
})

Given('{string} has never been fetched', function (slug: string) {
  // Restore real gdriveService.fetchTopicFile so the offline fallback logic runs.
  // (topic-lazy-load's Before hook replaces it with a mock — we undo that here.)
  gdriveService.fetchTopicFile = origFetchTopicFile
  indexedDBService.getTopicFile = async (s: string) => (s === slug ? null : null)
  indexedDBService.getTopicFetchedAt = async () => null
})

// ─── When ────────────────────────────────────────────────────────────────────

When('the user opens the review session for {string}', async function (slug: string) {
  renderReviewPage(slug)
  await waitFor(
    () => {
      const card = screen.queryByTestId('flash-card')
      const complete = screen.queryByTestId('session-complete')
      if (!card && !complete) throw new Error('Waiting for review session to load')
    },
    { timeout: 5000 },
  )
})

When('the user opens the app', async function () {
  renderTopicBrowser()
  await waitFor(
    () => {
      const browser = screen.queryByTestId('topic-browser')
      const errorState = screen.queryByTestId('error-state')
      if (!browser && !errorState) throw new Error('Waiting for app to render')
    },
    { timeout: 5000 },
  )
})

When('the user opens the {string} topic detail page', async function (slug: string) {
  renderTopicDetailPage(slug)
  await waitFor(
    () => {
      const detail = screen.queryByTestId('topic-detail')
      const error = screen.queryByTestId('topic-detail-error')
      if (!detail && !error) throw new Error('Still loading topic detail')
    },
    { timeout: 5000 },
  )
})

// ─── Then ────────────────────────────────────────────────────────────────────

Then('the review session starts normally', function () {
  screen.getByTestId('flash-card')
})

Then('rating cards works and persists to localStorage', function () {
  act(() => { useReviewStore.getState().flip() })
  act(() => { useReviewStore.getState().rate('Good') })
  const srState = localStorage.getItem('sr_state')
  if (!srState) throw new Error('sr_state not found in localStorage after rating')
  const parsed = JSON.parse(srState) as Record<string, unknown>
  if (Object.keys(parsed).length === 0) throw new Error('sr_state is empty after rating')
})

Then('the OfflineBanner is visible', async function () {
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
  await waitFor(() => {
    screen.getByTestId('offline-banner')
  }, { timeout: 3000 })
})

Then('it shows the time since last successful sync', function () {
  const banner = screen.getByTestId('offline-banner')
  const text = banner.textContent ?? ''
  if (!text.includes('synced') && !text.includes('sync')) {
    throw new Error(`Banner does not show sync info. Text: "${text}"`)
  }
})

Then('the topic browser shows all cached topics', function () {
  const cards = screen.getAllByTestId(/^topic-card-/)
  if (!cards.length) throw new Error('No topic cards shown from cache')
})

Then('each topic card shows data from the cache', function () {
  const cachedIndex = this.cachedIndex as FlashcardsIndex | undefined
  if (!cachedIndex) return
  for (const topic of cachedIndex.topics) {
    screen.getByTestId(`topic-card-${topic.slug}`)
  }
})

Then('an error message is shown: {string}', async function (message: string) {
  await waitFor(() => {
    const errorEl = screen.queryByTestId('topic-detail-error')
    if (!errorEl) throw new Error('topic-detail-error not found')
    if (!errorEl.textContent?.includes(message)) {
      throw new Error(`Expected error message "${message}", got: "${errorEl.textContent}"`)
    }
  }, { timeout: 5000 })
})

Then('a {string} message is shown', function (message: string) {
  const syncEl = screen.queryByTestId('sync-when-online')
  if (syncEl) {
    if (!syncEl.textContent?.includes(message)) {
      throw new Error(`Expected "${message}", got: "${syncEl.textContent}"`)
    }
    return
  }
  const body = document.body.textContent ?? ''
  if (!body.includes(message)) {
    throw new Error(`Expected message "${message}" not found on page`)
  }
})
