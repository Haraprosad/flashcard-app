import React from 'react'
import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useAuthStore } from '../../src/stores/authStore'
import { useTopicStore } from '../../src/stores/topicStore'
import { useReviewStore } from '../../src/stores/reviewStore'
import { srStateService } from '../../src/services/srStateService'
import { ExplorationCard } from '../../src/components/ExplorationCard'
import type { FlashCard, CardSRData, TopicFile, ExplorationStep } from '../../src/types'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const STEPS: ExplorationStep[] = [
  { kind: 'scenario', title: 'Scenario', body: 'Scenario body text about entropy.' },
  { kind: 'problem', title: 'Problem', body: 'Problem body: why does disorder grow?' },
  { kind: 'guide', title: 'Guide', body: 'Guide body: the Boltzmann equation explains it.' },
  {
    kind: 'challenge',
    title: 'Challenge',
    body: 'What is the symbol for entropy?',
    challenge_options: ['E', 'S', 'H', 'G'],
    challenge_answer: 1,
    challenge_explanation: 'S is the standard symbol for entropy in thermodynamics.',
  },
]

const FREE_TEXT_STEPS: ExplorationStep[] = [
  { kind: 'scenario', title: 'Scenario', body: 'Scenario body.' },
  { kind: 'problem', title: 'Problem', body: 'Problem body.' },
  { kind: 'guide', title: 'Guide', body: 'Guide body.' },
  {
    kind: 'challenge',
    title: 'Challenge',
    body: 'Type the letter symbol for entropy.',
    challenge_input: true,
    challenge_answer: 0,
    challenge_options: ['S'],
  },
]

function makeExplorationCard(overrides: Partial<FlashCard> = {}): FlashCard {
  return {
    id: 'topic-explore-0',
    type: 'exploration',
    tier: 1,
    front: '',
    back: '',
    steps: STEPS,
    topic: 'topic',
    tags: [],
    source_file: 'topic.md',
    created_at: new Date().toISOString(),
    concept_id: 'entropy',
    ...overrides,
  }
}

function makeFsrsCard(overrides: Partial<FlashCard> = {}): FlashCard {
  return {
    id: 'topic-entropy-1',
    type: 'standard',
    tier: 1,
    front: 'What is entropy?',
    back: 'Disorder in a system.',
    topic: 'topic',
    tags: [],
    source_file: 'topic.md',
    created_at: new Date().toISOString(),
    concept_id: 'entropy',
    ...overrides,
  }
}

function makeStandaloneCard(): FlashCard {
  return {
    id: 'topic-simple-0',
    type: 'standard',
    tier: 1,
    front: 'What is a molecule?',
    back: 'Smallest unit.',
    topic: 'topic',
    tags: [],
    source_file: 'topic.md',
    created_at: new Date().toISOString(),
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

function setTopicInStore(cards: FlashCard[]) {
  const topic: TopicFile = {
    version: '2.0',
    slug: 'topic',
    title: 'Topic',
    generated_at: new Date().toISOString(),
    cards,
  }
  useTopicStore.setState({ topics: { topic }, loading: {}, error: {}, sessionFetchedAt: {} })
}

function setDueSRState(cards: FlashCard[]) {
  const srState: Record<string, CardSRData> = {}
  for (const card of cards) {
    if (card.type !== 'exploration') {
      srState[card.id] = makeDueSRData()
    }
  }
  localStorage.setItem('sr_state', JSON.stringify(srState))
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

Before(function () {
  useAuthStore.setState({ accessToken: 'test-token', userEmail: 'test@example.com' })
  localStorage.removeItem('sr_state')
  localStorage.removeItem('explored_concepts')
})

After(function () {
  cleanup()
  useAuthStore.setState({ accessToken: null, userEmail: null })
  useTopicStore.setState({ topics: {}, loading: {}, error: {}, sessionFetchedAt: {} })
  useReviewStore.getState().reset()
  localStorage.removeItem('sr_state')
  localStorage.removeItem('explored_concepts')
})

// ─── Given ─────────────────────────────────────────────────────────────────

Given('I have a topic with an exploration card and T1 cards for concept {string}', function (conceptId: string) {
  const cards = [
    makeExplorationCard({ concept_id: conceptId }),
    makeFsrsCard({ concept_id: conceptId }),
  ]
  setTopicInStore(cards)
  setDueSRState(cards)
})

Given('the concept {string} has not been explored', function (conceptId: string) {
  const ids = srStateService.getExploredConceptIds().filter((id) => id !== conceptId)
  localStorage.setItem('explored_concepts', JSON.stringify(ids))
})

Given('the concept {string} has been explored', function (conceptId: string) {
  srStateService.markExplored(conceptId)
})

Given('I have loaded a session for the topic', function () {
  const topics = useTopicStore.getState().topics
  const cards = Object.values(topics).flatMap((t) => t.cards)
  useReviewStore.getState().loadSession('topic', cards)
})

Given('I have a topic with a standalone card and an exploration card for concept {string}', function (conceptId: string) {
  const cards = [
    makeExplorationCard({ concept_id: conceptId }),
    makeFsrsCard({ concept_id: conceptId }),
    makeStandaloneCard(),
  ]
  setTopicInStore(cards)
  setDueSRState(cards)
})

Given('I have a topic with only T1 cards for concept {string} \\(no exploration card\\)', function (conceptId: string) {
  const cards = [makeFsrsCard({ concept_id: conceptId })]
  setTopicInStore(cards)
  setDueSRState(cards)
})

Given('I render an ExplorationCard with 4 steps', function () {
  this.onComplete = { called: false, result: null }
  this.onSkip = { called: false }
  render(
    <ExplorationCard
      steps={STEPS}
      onComplete={(result) => { this.onComplete = { called: true, result } }}
      onSkip={() => { this.onSkip.called = true }}
    />,
  )
})

Given('I render an ExplorationCard at the challenge step with multiple-choice options', function () {
  this.onComplete = { called: false, result: null }
  this.onSkip = { called: false }
  render(
    <ExplorationCard
      steps={STEPS}
      onComplete={(result) => { this.onComplete = { called: true, result } }}
      onSkip={() => { this.onSkip.called = true }}
    />,
  )
  // Advance to challenge step (click Next 3 times)
  for (let i = 0; i < 3; i++) {
    const nextBtn = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextBtn)
  }
})

Given('I render an ExplorationCard at the challenge step with free-text input', function () {
  this.onComplete = { called: false, result: null }
  this.onSkip = { called: false }
  render(
    <ExplorationCard
      steps={FREE_TEXT_STEPS}
      onComplete={(result) => { this.onComplete = { called: true, result } }}
      onSkip={() => { this.onSkip.called = true }}
    />,
  )
  for (let i = 0; i < 3; i++) {
    const nextBtn = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextBtn)
  }
})

Given('I have answered the challenge correctly', function () {
  // Phase 16.1: must select confidence first
  const confidenceBtn = screen.getByTestId('confidence-high')
  fireEvent.click(confidenceBtn)

  const correctBtn = screen.getAllByRole('button').find((b) =>
    b.textContent?.trim() === 'S',
  )
  if (!correctBtn) throw new Error('Could not find correct answer button "S"')
  fireEvent.click(correctBtn)
  const checkBtn = screen.getByRole('button', { name: /check answer/i })
  fireEvent.click(checkBtn)
})

// ─── When ──────────────────────────────────────────────────────────────────

When('I load a session for the topic', function () {
  const topics = useTopicStore.getState().topics
  const cards = Object.values(topics).flatMap((t) => t.cards)
  useReviewStore.getState().loadSession('topic', cards)
})

When('I complete the exploration for concept {string}', function (conceptId: string) {
  useReviewStore.getState().advanceExploration(conceptId)
})

When('I skip the exploration for concept {string}', function (conceptId: string) {
  useReviewStore.getState().advanceExploration(conceptId)
})

When('I click the {string} button', function (label: string) {
  const btn = screen.getByRole('button', { name: new RegExp(label, 'i') })
  fireEvent.click(btn)
})

When('I click {string}', function (label: string) {
  // Try button first, then link
  const btn = screen.queryByRole('button', { name: new RegExp(label, 'i') })
  if (btn) {
    fireEvent.click(btn)
    return
  }
  const link = screen.getByRole('link', { name: new RegExp(label, 'i') })
  fireEvent.click(link)
})

When('I select the correct answer', function () {
  // Phase 16.1: if confidence not yet selected, default to "high"
  const highBtn = screen.queryByTestId('confidence-high')
  if (highBtn && highBtn.getAttribute('aria-pressed') !== 'true') {
    fireEvent.click(highBtn)
  }
  // Correct option is "S" (index 1 in STEPS challenge)
  const btn = screen.getAllByRole('button').find((b) => b.textContent?.trim() === 'S')
  if (!btn) throw new Error('Correct answer button "S" not found')
  fireEvent.click(btn)
})

When('I select a wrong answer', function () {
  // Phase 16.1: if confidence not yet selected, default to "low"
  const lowBtn = screen.queryByTestId('confidence-low')
  if (lowBtn && lowBtn.getAttribute('aria-pressed') !== 'true') {
    fireEvent.click(lowBtn)
  }
  // Wrong option is "E" (index 0)
  const btn = screen.getAllByRole('button').find((b) => b.textContent?.trim() === 'E')
  if (!btn) throw new Error('Wrong answer button "E" not found')
  fireEvent.click(btn)
})

When('I type the correct answer in lower case', function () {
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 's' } })
})

// ─── Then ──────────────────────────────────────────────────────────────────

Then('the session queue should start with the exploration card for {string}', function (conceptId: string) {
  const { queue } = useReviewStore.getState()
  const first = queue[0]
  if (!first) throw new Error('Session queue is empty')
  if (first.type !== 'exploration') throw new Error(`Expected exploration card at position 0, got type="${first.type}"`)
  if (first.concept_id !== conceptId) throw new Error(`Expected concept_id="${conceptId}", got "${first.concept_id}"`)
})

Then('the session queue should not include FSRS cards for concept {string}', function (conceptId: string) {
  const { queue } = useReviewStore.getState()
  const fsrsCards = queue.filter((c) => c.concept_id === conceptId && c.type !== 'exploration')
  if (fsrsCards.length > 0) throw new Error(`Expected no FSRS cards for concept "${conceptId}", found ${fsrsCards.length}`)
})

Then('the concept {string} should be marked as explored', function (conceptId: string) {
  if (!srStateService.isExplored(conceptId)) {
    throw new Error(`Concept "${conceptId}" is not marked as explored`)
  }
})

Then('the session queue should now include the T1 cards for concept {string}', function (conceptId: string) {
  const { queue } = useReviewStore.getState()
  const t1 = queue.filter((c) => c.concept_id === conceptId && c.tier === 1 && c.type !== 'exploration')
  if (t1.length === 0) throw new Error(`Expected T1 cards for concept "${conceptId}" in queue after exploration`)
})

Then('the session queue should not contain any exploration cards', function () {
  const { queue } = useReviewStore.getState()
  const exp = queue.filter((c) => c.type === 'exploration')
  if (exp.length > 0) throw new Error(`Expected no exploration cards in queue, found ${exp.length}`)
})

Then('the session queue should include the T1 cards for concept {string}', function (conceptId: string) {
  const { queue } = useReviewStore.getState()
  const t1 = queue.filter((c) => c.concept_id === conceptId && c.tier === 1 && c.type !== 'exploration')
  if (t1.length === 0) throw new Error(`Expected T1 cards for concept "${conceptId}" in queue`)
})

Then('the session queue should include the standalone card', function () {
  const { queue } = useReviewStore.getState()
  const found = queue.find((c) => c.id === 'topic-simple-0')
  if (!found) throw new Error('Standalone card "topic-simple-0" not found in queue')
})

Then('I should see the exploration card', function () {
  const card = screen.getByTestId('exploration-card')
  if (!card) throw new Error('exploration-card not found')
})

Then('I should see the step indicator with {int} dots', function (count: number) {
  const dots = screen.getAllByTestId(/^step-dot-/)
  if (dots.length !== count) throw new Error(`Expected ${count} step dots, found ${dots.length}`)
})

Then('I should see the scenario step body text', function () {
  if (!screen.queryByText(/Scenario body text about entropy/i)) {
    throw new Error('Scenario body text not found')
  }
})

Then('I should see a {string} button', function (label: string) {
  const btn = screen.getByRole('button', { name: new RegExp(label, 'i') })
  if (!btn) throw new Error(`Button "${label}" not found`)
})

Then('I should see the {string} button', function (label: string) {
  const btn = screen.getByRole('button', { name: new RegExp(label, 'i') })
  if (!btn) throw new Error(`Button "${label}" not found`)
})

Then('I should see the overflow menu button', function () {
  const btn = screen.queryByTestId('exploration-overflow-menu')
  if (!btn) throw new Error('Overflow menu button not found')
})

Then('I should not see a link with text {string}', function (text: string) {
  const link = screen.queryByRole('link', { name: new RegExp(text, 'i') })
  if (link) throw new Error(`Link "${text}" should not be visible`)
})

Then('I should see {string} message', function (text: string) {
  if (!screen.queryByText(new RegExp(text, 'i'))) {
    throw new Error(`"${text}" message not found`)
  }
})

When('I click the overflow menu button', function () {
  const btn = screen.getByTestId('exploration-overflow-menu')
  fireEvent.click(btn)
})

Then('I should see the problem step body text', function () {
  if (!screen.queryByText(/why does disorder grow/i)) {
    throw new Error('Problem step body text not found')
  }
})

Then('the first indicator dot should be marked done', function () {
  const dot = screen.getByTestId('step-dot-0')
  const isDone = dot.getAttribute('data-done') === 'true'
  if (!isDone) throw new Error('First indicator dot is not marked done')
})

Then('I should see a success message', function () {
  if (!screen.queryByTestId('challenge-success')) {
    throw new Error('Success message not found')
  }
})

Then('I should see the challenge explanation text', function () {
  // Phase 16.2: explanation is hidden by default; click "See why" if present
  const seeWhyBtn = screen.queryByTestId('see-why-button')
  if (seeWhyBtn) fireEvent.click(seeWhyBtn)
  if (!screen.queryByText(/S is the standard symbol/i)) {
    throw new Error('Challenge explanation text not found')
  }
})

Then('the onComplete callback should have been called', function () {
  if (!this.onComplete?.called) throw new Error('onComplete was not called')
})

Then('the onSkip callback should have been called', function () {
  if (!this.onSkip?.called) throw new Error('onSkip was not called')
})
