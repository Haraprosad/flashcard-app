import React from 'react'
import { Given, When, Then, After } from '@cucumber/cucumber'
import { render, screen, cleanup } from '@testing-library/react'
import { progressStore } from '../../src/stores/progressStore'
import type { ExplorationConceptRecord } from '../../src/types'
import { ProgressPage } from '../../src/pages/ProgressPage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Reuses:
//   Given I render an ExplorationCard at the challenge step with multiple-choice options
//   When I select the {string} confidence level
//   When I select the correct answer / I select a wrong answer
//   When I click the {string} button
// — all from exploration-cards.steps.tsx

After(function () {
  cleanup()
  progressStore._resetForTests()
})

Then('the onComplete result should have firstAttemptCorrect as true', function () {
  const result = (this.onComplete as { called: boolean; result: { firstAttemptCorrect: boolean | null } | null })?.result
  if (!result) throw new Error('onComplete was not called')
  if (result.firstAttemptCorrect !== true) {
    throw new Error(`Expected firstAttemptCorrect=true, got ${String(result.firstAttemptCorrect)}`)
  }
})

Then('the onComplete result should have firstAttemptCorrect as false', function () {
  const result = (this.onComplete as { called: boolean; result: { firstAttemptCorrect: boolean | null } | null })?.result
  if (!result) throw new Error('onComplete was not called')
  if (result.firstAttemptCorrect !== false) {
    throw new Error(`Expected firstAttemptCorrect=false, got ${String(result.firstAttemptCorrect)}`)
  }
})

Given('exploration records with {int} total and {int} first-attempt correct', function (total: number, correct: number) {
  // Seed exploration records into progressStore
  for (let i = 0; i < total; i++) {
    const record: ExplorationConceptRecord = {
      conceptId: `concept-${i}`,
      completedAt: new Date().toISOString(),
      confidenceRating: 'medium',
      firstAttemptCorrect: i < correct,
    }
    progressStore.recordExplorationResult(record)
  }
})

When('I view the progress page', function () {
  render(
    <GoogleOAuthProvider clientId="test-client-id">
      <MemoryRouter initialEntries={['/progress']}>
        <Routes>
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </MemoryRouter>
    </GoogleOAuthProvider>,
  )
})

Then('I should see the first-try rate stat', function () {
  const el = screen.queryByTestId('first-attempt-rate')
  if (!el) throw new Error('first-attempt-rate stat not found on ProgressPage')
})
