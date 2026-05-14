import React from 'react'
import { Given, When, Then, After } from '@cucumber/cucumber'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useIndexStore } from '../../src/stores/indexStore'
import { indexedDBService } from '../../src/services/indexedDBService'
import { TopicBrowserPage } from '../../src/pages/TopicBrowserPage'
import type { FlashcardsIndex, TopicMeta } from '../../src/types'

const origFetch = globalThis.fetch
const origGetIndex = indexedDBService.getIndex
const origSaveIndex = indexedDBService.saveIndex

function renderApp(path: string) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/topics" element={<TopicBrowserPage />} />
          <Route path="*" element={<Navigate to="/topics" replace />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

function createMockIndex(): FlashcardsIndex {
  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    topics: [
      { slug: 'kubernetes', title: 'Kubernetes', card_count: 48, source_files: ['k8s.md'], generated_at: '' },
      { slug: 'python', title: 'Python', card_count: 62, source_files: ['python.md'], generated_at: '' },
      { slug: 'react', title: 'React', card_count: 35, source_files: ['react.md'], generated_at: '' },
    ],
  }
}

// ─── After ──────────────────────────────────────────────────────────────────

After(function () {
  globalThis.fetch = origFetch
  indexedDBService.getIndex = origGetIndex
  indexedDBService.saveIndex = origSaveIndex
  useIndexStore.setState({ index: null, topics: [], loading: false, error: null, isOffline: false })
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('the user is authenticated with a valid token', function () {
  useAuthStore.setState({ accessToken: 'valid-token-123', userEmail: 'user@example.com' })
})

Given('the user is authenticated', function () {
  useAuthStore.setState({ accessToken: 'valid-token-123', userEmail: 'user@example.com' })
})

Given('Google Drive contains {string} in {string}', function (_file: string, _folder: string) {
  this.mockIndex = createMockIndex()
  this.fetchCalls = [] as string[]

  indexedDBService.saveIndex = async () => {}

  const self = this
  globalThis.fetch = async function (input: RequestInfo | URL) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const decoded = decodeURIComponent(url)
    self.fetchCalls.push(url)

    if (decoded.includes('ObsidianSecondBrain') && decoded.includes('mimeType')) {
      return new Response(
        JSON.stringify({ files: [{ id: 'parent-folder-id', name: 'ObsidianSecondBrain' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (decoded.includes('flashcards') && decoded.includes('mimeType')) {
      return new Response(
        JSON.stringify({ files: [{ id: 'flashcards-folder-id', name: 'flashcards' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (decoded.includes("name='index.json'")) {
      return new Response(
        JSON.stringify({ files: [{ id: 'index-file-id', name: 'index.json' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (decoded.includes('alt=media')) {
      return new Response(JSON.stringify(self.mockIndex), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not found', { status: 404 })
  } as typeof fetch
})

Given(/^"([^"]*)" contains (\d+) topics$/, function (_file: string, _count: number, dataTable: { hashes: () => Array<Record<string, string>> }) {
  const rows = dataTable.hashes()
  const topics: TopicMeta[] = rows.map((row) => ({
    slug: row.slug,
    title: row.topic,
    card_count: parseInt(row.card_count, 10),
    source_files: [],
    generated_at: new Date().toISOString(),
  }))

  this.mockIndex = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    topics,
  }

  useIndexStore.setState({
    index: this.mockIndex as FlashcardsIndex,
    topics,
    loading: false,
    error: null,
    isOffline: false,
  })
})

Given('Google Drive returns a network error', function () {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
})

Given('IndexedDB has a cached index', function () {
  const cachedIndex: FlashcardsIndex = {
    version: '1.0',
    generated_at: '2024-01-01T00:00:00Z',
    topics: [
      { slug: 'cached-topic', title: 'Cached Topic', card_count: 10, source_files: [], generated_at: '' },
    ],
  }
  indexedDBService.getIndex = async () => cachedIndex
  indexedDBService.saveIndex = async () => {}
})

Given('IndexedDB has no cached index', function () {
  indexedDBService.getIndex = async () => null
  indexedDBService.saveIndex = async () => {}
})

// ─── When ───────────────────────────────────────────────────────────────────

When('the app navigates to {string}', async function (path: string) {
  renderApp(path)
  await waitFor(
    () => {
      const browser = screen.queryByTestId('topic-browser')
      const errorState = screen.queryByTestId('error-state')
      if (!browser && !errorState) throw new Error('Waiting for content')
    },
    { timeout: 5000 },
  )
})

When('the topic browser loads', function () {
  renderApp('/topics')
})

// ─── Then ───────────────────────────────────────────────────────────────────

Then('a GET request is made to the Google Drive files API', function () {
  const hasDriveCall = (this.fetchCalls as string[]).some((url: string) => url.includes('googleapis.com/drive'))
  if (!hasDriveCall) throw new Error('No request made to Google Drive API')
})

Then('the query includes name={string}', function (query: string) {
  const fullQuery = `name='${query}'`
  const hasQuery = (this.fetchCalls as string[]).some((url: string) =>
    decodeURIComponent(url).includes(fullQuery),
  )
  if (!hasQuery) {
    throw new Error(
      `No fetch call includes "${fullQuery}". URLs: ${(this.fetchCalls as string[]).join(', ')}`,
    )
  }
})

Then('the topics list is populated from the response', function () {
  const { topics } = useIndexStore.getState()
  if (!topics.length) throw new Error('Topics list is empty')
})

Then('{int} topic cards are visible', function (count: number) {
  const cards = screen.getAllByTestId(/^topic-card-/)
  if (cards.length !== count) throw new Error(`Expected ${count} topic cards, found ${cards.length}`)
})

Then('the {string} card shows {string}', function (topicName: string, text: string) {
  const slug = topicName.toLowerCase()
  const card = screen.getByTestId(`topic-card-${slug}`)
  if (!card.textContent?.includes(text)) {
    throw new Error(`Card "${topicName}" does not show "${text}". Content: ${card.textContent}`)
  }
})

Then('the cached index is used', function () {
  const { topics, isOffline } = useIndexStore.getState()
  if (!topics.length) throw new Error('No topics loaded from cache')
  if (!isOffline) throw new Error('Expected offline flag to be true')
})

Then('an OfflineBanner is shown', function () {
  screen.getByTestId('offline-banner')
})

Then('an error state is shown', function () {
  screen.getByTestId('error-state')
})

Then('a {string} button is visible', function (label: string) {
  screen.getByRole('button', { name: new RegExp(label, 'i') })
})
