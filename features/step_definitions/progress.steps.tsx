import React from 'react'
import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { render, screen, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { progressStore, getHeatmapLevel } from '../../src/stores/progressStore'
import { srStateService } from '../../src/services/srStateService'
import { ProgressPage } from '../../src/pages/ProgressPage'
import type { StreakData, FlashCard, CardSRData, SRState, TopicFile } from '../../src/types'

function renderProgressPage() {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={['/progress']}>
        <Routes>
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
}

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

Before(function () {
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  this.testCount = 0
  this.savedLongest = 0
})

After(function () {
  cleanup()
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
})

// ─── Streak scenarios ────────────────────────────────────────────────────────

Given('the user has not reviewed any cards today', function () {
  const yesterday = dateOffset(-1)
  progressStore._setStreakDataForTests({ current: 0, longest: 0, last_review_date: yesterday })
})

Given('the current streak is set to {int}', function (streak: number) {
  const existing = progressStore.getStreakData()
  progressStore._setStreakDataForTests({
    ...existing,
    current: streak,
    longest: Math.max(existing.longest, streak),
  })
})

When('the user completes at least 1 card review', function () {
  act(() => { progressStore.recordReview('test-card-0', 'Good') })
})

When('the user reviews more cards', function () {
  act(() => { progressStore.recordReview('test-card-1', 'Good') })
})

Then('the streak becomes {int}', function (expected: number) {
  const actual = progressStore.getStreakData().current
  if (actual !== expected) throw new Error(`Expected streak ${expected} but got ${actual}`)
})

Then('the streak remains {int}', function (expected: number) {
  const actual = progressStore.getStreakData().current
  if (actual !== expected) throw new Error(`Expected streak to remain ${expected} but got ${actual}`)
})

Then('"last_review_date" in localStorage is set to today', function () {
  const today = todayStr()
  const data = progressStore.getStreakData()
  if (data.last_review_date !== today)
    throw new Error(`Expected last_review_date "${today}" but got "${data.last_review_date}"`)
})

// ─── Streak reset scenario ───────────────────────────────────────────────────

Given('"last_review_date" is 2 days ago', function () {
  const twoDaysAgo = dateOffset(-2)
  progressStore._setStreakDataForTests({ current: 5, longest: 7, last_review_date: twoDaysAgo })
  this.savedLongest = 7
})

Then('the current streak is {int}', function (expected: number) {
  const actual = progressStore.getStreakData().current
  if (actual !== expected) throw new Error(`Expected current streak ${expected} but got ${actual}`)
})

Then('the longest streak is preserved', function () {
  const actual = progressStore.getStreakData().longest
  if (actual !== this.savedLongest)
    throw new Error(`Expected longest streak ${String(this.savedLongest)} but got ${actual}`)
})

// ─── No double-increment scenario ───────────────────────────────────────────

Given('the user has already reviewed cards today', function () {
  const today = todayStr()
  progressStore._setReviewLogForTests({ [today]: 1 })
  progressStore._setStreakDataForTests({ current: 0, longest: 0, last_review_date: today })
})

// ─── Heatmap scenarios ───────────────────────────────────────────────────────

Given('the user has review log entries for the last 90 days', function () {
  const log: Record<string, number> = {}
  for (let i = 0; i < 90; i++) {
    log[dateOffset(-i)] = i + 1
  }
  progressStore._setReviewLogForTests(log)
})

When('the progress page loads', async function () {
  await act(async () => { renderProgressPage() })
})

Then('the heatmap shows {int} cells', function (count: number) {
  const cells = screen.getAllByTestId('heatmap-cell')
  if (cells.length !== count)
    throw new Error(`Expected ${count} heatmap cells but found ${cells.length}`)
})

Then('each cell reflects the review count for that day', function () {
  const cells = screen.getAllByTestId('heatmap-cell')
  const heatmapData = progressStore.getHeatmapData()
  cells.forEach((cell, i) => {
    const date = cell.getAttribute('data-date')
    const count = Number(cell.getAttribute('data-count'))
    if (date !== heatmapData[i].date)
      throw new Error(`Cell ${i}: expected date ${heatmapData[i].date} but got ${date}`)
    if (count !== heatmapData[i].count)
      throw new Error(`Cell ${i} (${date}): expected count ${heatmapData[i].count} but got ${count}`)
  })
})

// ─── Heatmap color levels ────────────────────────────────────────────────────

Given('a day with {int} reviews', function (count: number) {
  this.testCount = count
})

Then('that cell is gray', function () {
  const level = getHeatmapLevel(this.testCount as number)
  if (level !== 0) throw new Error(`Expected level 0 (gray) for count ${String(this.testCount)}, got ${level}`)
})

Then('that cell is medium green', function () {
  const level = getHeatmapLevel(this.testCount as number)
  if (level !== 2) throw new Error(`Expected level 2 (medium green) for count ${String(this.testCount)}, got ${level}`)
})

Then('that cell is dark green', function () {
  const level = getHeatmapLevel(this.testCount as number)
  if (level !== 3) throw new Error(`Expected level 3 (dark green) for count ${String(this.testCount)}, got ${level}`)
})

// ─── Per-topic mastery ───────────────────────────────────────────────────────

Given('"kubernetes" has {int} cards', function (count: number) {
  const cards: FlashCard[] = Array.from({ length: count }, (_, i) => ({
    id: `kubernetes-source-${i}`,
    type: 'standard' as const,
    tier: 1 as const,
    front: `Q${i + 1}`,
    back: `A${i + 1}`,
    topic: 'kubernetes',
    tags: [],
    source_file: 'k8s.md',
    created_at: new Date().toISOString(),
  }))
  const topic: TopicFile = {
    version: '1.0',
    slug: 'kubernetes',
    title: 'Kubernetes',
    generated_at: new Date().toISOString(),
    cards,
  }
  useTopicStore.setState({ topics: { kubernetes: topic }, loading: {}, error: {}, sessionFetchedAt: {} })
  this.kubernetesCards = cards
})

Given('{int} cards have state=Review and reps>=3', function (count: number) {
  const cards = this.kubernetesCards as FlashCard[]
  for (let i = 0; i < count; i++) {
    srStateService.updateCard(cards[i].id, {
      due: new Date(Date.now() + 86400000).toISOString(),
      stability: 10,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 1,
      reps: 3,
      lapses: 0,
      state: 2,
      last_review: new Date().toISOString(),
    })
  }
})

Then('the {string} mastery percentage is {int}%', async function (topicTitle: string, pct: number) {
  const slug = topicTitle.toLowerCase()
  const el = await screen.findByTestId(`mastery-pct-${slug}`)
  if (!el.textContent?.includes(`${pct}%`))
    throw new Error(`Expected mastery ${pct}% for "${topicTitle}" but got "${el.textContent}"`)
})

// ─── Total stats ─────────────────────────────────────────────────────────────

Given('the review_log shows {int} total reviews', function (count: number) {
  progressStore._setReviewLogForTests({ [todayStr()]: count })
})

Then('the total reviews stat shows {int}', async function (count: number) {
  const el = await screen.findByTestId('total-reviews')
  if (!el.textContent?.includes(String(count)))
    throw new Error(`Expected total reviews "${count}" but got "${el.textContent}"`)
})
