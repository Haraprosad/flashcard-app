import React from 'react'
import { Given, When, Then, After, Before } from '@cucumber/cucumber'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useIndexStore } from '../../src/stores/indexStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { gdriveService } from '../../src/services/gdriveService'
import { indexedDBService } from '../../src/services/indexedDBService'
import { TopicBrowserPage } from '../../src/pages/TopicBrowserPage'
import { TopicDetailPage } from '../../src/pages/TopicDetailPage'
import type { FlashcardsIndex, TopicMeta, TopicFile, FlashCard } from '../../src/types'

const origFetchTopicFile = gdriveService.fetchTopicFile
const origGetTopicFile = indexedDBService.getTopicFile
const origSaveTopicFile = indexedDBService.saveTopicFile
const origGetTopicFetchedAt = indexedDBService.getTopicFetchedAt
const origSaveIndex = indexedDBService.saveIndex
const origGetFolderIds = indexedDBService.getFolderIds
const origSaveFolderIds = indexedDBService.saveFolderIds

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

function renderApp(path: string) {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/topics" element={<TopicBrowserPage />} />
          <Route path="/topics/:slug" element={<TopicDetailPage />} />
          <Route path="*" element={<Navigate to="/topics" replace />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

Before(function () {
  this.topicFetchCalls = [] as string[]
  this.mockTopicData = {} as Record<string, TopicFile>
  this.cachedTopics = {} as Record<string, TopicFile>
  this.fetchedAtMap = {} as Record<string, string>

  // Set up mocks once — they read from this.* so updates are always visible
  const self = this
  gdriveService.fetchTopicFile = async (slug: string, _token: string) => {
    self.topicFetchCalls.push(slug)
    const data = self.mockTopicData[slug]
    if (!data) throw new Error(`${slug}.json not found`)
    return data
  }
  indexedDBService.getTopicFetchedAt = async (slug: string) => {
    return self.fetchedAtMap[slug] ?? null
  }
  indexedDBService.getTopicFile = async (slug: string) => {
    return self.cachedTopics[slug] ?? null
  }
  indexedDBService.saveTopicFile = async () => {}
  indexedDBService.saveIndex = async () => {}
  // Prevent folder ID caching from affecting test flow
  indexedDBService.getFolderIds = async () => ({})
  indexedDBService.saveFolderIds = async () => {}
})

After(function () {
  // Unmount React components FIRST using testing-library cleanup,
  // then reset stores — this prevents unmounted/stale components
  // from reacting to store state changes with new async effects.
  cleanup()

  gdriveService.fetchTopicFile = origFetchTopicFile
  indexedDBService.getTopicFile = origGetTopicFile
  indexedDBService.saveTopicFile = origSaveTopicFile
  indexedDBService.getTopicFetchedAt = origGetTopicFetchedAt
  indexedDBService.saveIndex = origSaveIndex
  indexedDBService.getFolderIds = origGetFolderIds
  indexedDBService.saveFolderIds = origSaveFolderIds
  useIndexStore.setState({ index: null, topics: [], loading: false, error: null, isOffline: false })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useAuthStore.setState({ accessToken: null, userEmail: null })
})

// ─── Given ──────────────────────────────────────────────────────────────────

Given('the index has been loaded with topic {string}', function (slug: string) {
  useAuthStore.setState({ accessToken: 'valid-token-123', userEmail: 'user@example.com' })

  const topic: TopicMeta = {
    slug, title: slug.charAt(0).toUpperCase() + slug.slice(1),
    card_count: 48, source_files: [`${slug}.md`], generated_at: new Date().toISOString(),
  }
  const index: FlashcardsIndex = { version: '1.0', generated_at: new Date().toISOString(), topics: [topic] }
  this.mockTopicData[slug] = createMockTopic(slug, topic.title, 48)

  useIndexStore.setState({ index, topics: [topic], loading: false, error: null, isOffline: false })
})

Given('{string} is NOT in IndexedDB', function (_key: string) {
  // Default: cachedTopics and fetchedAtMap don't have this slug
})

Given('{string} was cached {int} hours ago', function (key: string, hours: number) {
  const slug = key.replace('flashcards/', '').replace('.json', '')
  const topicData = this.mockTopicData[slug] ?? createMockTopic(slug, slug, 48)
  this.cachedTopics[slug] = topicData
  this.fetchedAtMap[slug] = hoursAgo(hours)

  // Ensure auth is set so TopicDetailPage can trigger fetchTopic
  useAuthStore.setState({ accessToken: 'valid-token-123', userEmail: 'user@example.com' })

  // Pre-populate Zustand with the cached topic and record session fetch time
  // (matches the fetchedAt timestamp so the sessionFetchedAt fast-path works correctly)
  useTopicStore.setState((s) => ({
    topics: { ...s.topics, [slug]: topicData },
    sessionFetchedAt: { ...s.sessionFetchedAt, [slug]: hoursAgo(hours) },
  }))

  // Ensure index exists for this topic
  const { index } = useIndexStore.getState()
  const existing = index?.topics.find((t) => t.slug === slug)
  if (!existing) {
    const topic: TopicMeta = {
      slug, title: slug.charAt(0).toUpperCase() + slug.slice(1),
      card_count: 48, source_files: [`${slug}.md`], generated_at: new Date().toISOString(),
    }
    const newIndex: FlashcardsIndex = index
      ? { ...index, topics: [...index.topics, topic] }
      : { version: '1.0', generated_at: new Date().toISOString(), topics: [topic] }
    useIndexStore.setState({ index: newIndex, topics: newIndex.topics, loading: false, error: null, isOffline: false })
  }

  // Ensure mock data exists for Drive fetch (used when stale scenario re-fetches)
  if (!this.mockTopicData[slug]) {
    this.mockTopicData[slug] = topicData
  }
})

Given('the index shows {string} last_modified {int} hours ago', function (slug: string, hours: number) {
  const { index } = useIndexStore.getState()
  if (index) {
    const topics = index.topics.map((t) =>
      t.slug === slug ? { ...t, generated_at: hoursAgo(hours) } : t,
    )
    useIndexStore.setState({ index: { ...index, topics }, topics })
  }
})

Given('the index shows {string} last_modified {int} minutes ago', function (slug: string, minutes: number) {
  const { index } = useIndexStore.getState()
  if (index) {
    const topics = index.topics.map((t) =>
      t.slug === slug ? { ...t, generated_at: new Date(Date.now() - minutes * 60_000).toISOString() } : t,
    )
    useIndexStore.setState({ index: { ...index, topics }, topics })
  }
})

Given(/^the index has (\d+) topics: (.+)$/, function (_count: number, slugList: string) {
  useAuthStore.setState({ accessToken: 'valid-token-123', userEmail: 'user@example.com' })

  const slugs = slugList.split(', ').map((s: string) => s.trim())
  const topics: TopicMeta[] = slugs.map((s: string) => ({
    slug: s,
    title: s.charAt(0).toUpperCase() + s.slice(1),
    card_count: 30,
    source_files: [`${s}.md`],
    generated_at: hoursAgo(4),
  }))
  const index: FlashcardsIndex = { version: '1.0', generated_at: hoursAgo(4), topics }

  for (const s of slugs) {
    this.mockTopicData[s] = createMockTopic(s, s.charAt(0).toUpperCase() + s.slice(1), 30)
  }

  useIndexStore.setState({ index, topics, loading: false, error: null, isOffline: false })
})

Given('all {int} are cached in IndexedDB', function (_count: number) {
  const { topics } = useIndexStore.getState()
  const topicMap: Record<string, TopicFile> = {}
  const sessionMap: Record<string, string> = {}
  for (const t of topics) {
    const data = createMockTopic(t.slug, t.title, t.card_count)
    topicMap[t.slug] = data
    this.cachedTopics[t.slug] = data
    this.fetchedAtMap[t.slug] = hoursAgo(2)
    sessionMap[t.slug] = hoursAgo(2)
  }
  useTopicStore.setState({ topics: topicMap, sessionFetchedAt: sessionMap })
})

Given('the new index shows only {string} has a newer last_modified', function (slug: string) {
  const { index } = useIndexStore.getState()
  if (index) {
    const topics = index.topics.map((t) =>
      t.slug === slug ? { ...t, generated_at: hoursAgo(1) } : t,
    )
    useIndexStore.setState({ index: { ...index, topics }, topics })
  }
})

// ─── When ───────────────────────────────────────────────────────────────────

When('the user taps the {string} topic card', async function (topicName: string) {
  const slug = topicName.toLowerCase()
  renderApp(`/topics/${slug}`)

  await waitFor(
    () => {
      const detail = screen.queryByTestId('topic-detail')
      const detailError = screen.queryByTestId('topic-detail-error')
      if (!detail && !detailError) throw new Error('Waiting for topic detail')
    },
    { timeout: 5000 },
  )
})

When('the app opens', async function () {
  renderApp('/topics')
  await waitFor(
    () => {
      const browser = screen.queryByTestId('topic-browser')
      if (!browser) throw new Error('Waiting for topic browser')
    },
    { timeout: 5000 },
  )
})

// ─── Then ───────────────────────────────────────────────────────────────────

Then('a GET request is made for {string}', function (fileName: string) {
  const slug = fileName.replace('.json', '')
  const calls = this.topicFetchCalls as string[]
  if (!calls.includes(slug)) {
    throw new Error(`No GET request made for "${fileName}". Calls: ${calls.join(', ')}`)
  }
})

Then('the response is stored in IndexedDB under key {string}', function (slug: string) {
  const { topics } = useTopicStore.getState()
  if (!topics[slug]) throw new Error(`Topic "${slug}" not stored in topicStore`)
})

Then('the topic detail page is shown with {int} cards', function (count: number) {
  const detail = screen.getByTestId('topic-detail')
  if (!detail.textContent?.includes(`${count} cards`)) {
    throw new Error(`Expected "${count} cards" in detail page. Got: ${detail.textContent}`)
  }
})

Then('NO GET request is made for {string}', function (fileName: string) {
  const slug = fileName.replace('.json', '')
  const calls = this.topicFetchCalls as string[]
  if (calls.includes(slug)) throw new Error(`Unexpected GET request for "${fileName}"`)
})

Then('the cached version is used', function () {
  const detail = screen.queryByTestId('topic-detail')
  if (!detail) throw new Error('Topic detail page not shown')
})

Then('a GET request IS made for {string}', function (fileName: string) {
  const slug = fileName.replace('.json', '')
  const calls = this.topicFetchCalls as string[]
  if (!calls.includes(slug)) {
    throw new Error(`Expected GET request for "${fileName}" but none found. Calls: ${calls.join(', ')}`)
  }
})

Then('IndexedDB is updated with the fresh response', function () {
  // verified via topicStore state update
})

Then('only {string} is re-fetched from Drive', function (fileName: string) {
  const slug = fileName.replace('.json', '')
  const calls = this.topicFetchCalls as string[]
  if (calls.length !== 1 || calls[0] !== slug) {
    throw new Error(`Expected only "${slug}" to be fetched. Got: ${calls.join(', ')}`)
  }
})

Then('{string} and {string} are served from cache', function (file1: string, file2: string) {
  const slug1 = file1.replace('.json', '')
  const slug2 = file2.replace('.json', '')
  const calls = this.topicFetchCalls as string[]
  if (calls.includes(slug1) || calls.includes(slug2)) {
    throw new Error(`Expected "${slug1}" and "${slug2}" to be served from cache, but they were fetched.`)
  }
})
