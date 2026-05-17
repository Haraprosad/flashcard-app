import { When, Then } from '@cucumber/cucumber'
import { screen, fireEvent } from '@testing-library/react'
import type { ConfidenceRating } from '../../src/types'

// Reuses from exploration-cards.steps.tsx:
//   Given I render an ExplorationCard at the challenge step with multiple-choice options
//   When I select the correct answer
//   When I click the {string} button
//   Then I should see a success message

When('I select the {string} confidence level', function (level: string) {
  const testId = `confidence-${level.toLowerCase()}`
  const btn = screen.getByTestId(testId)
  fireEvent.click(btn)
  this.selectedConfidence = level.toLowerCase() as ConfidenceRating
})

Then('the option buttons should be disabled', function () {
  const container = screen.getByTestId('challenge-options-container')
  const isDisabled = container.getAttribute('aria-disabled') === 'true'
  if (!isDisabled) throw new Error('Challenge options container is not aria-disabled')
})

Then('the {string} button should be disabled', function (label: string) {
  const btn = screen.getByRole('button', { name: new RegExp(label, 'i') })
  if (!btn.hasAttribute('disabled')) {
    throw new Error(`Button "${label}" is not disabled`)
  }
})

Then('the option buttons should be enabled', function () {
  const container = screen.getByTestId('challenge-options-container')
  const isDisabled = container.getAttribute('aria-disabled') === 'true'
  if (isDisabled) throw new Error('Challenge options container is still aria-disabled after confidence selection')
})

Then('the confidence rating {string} should be stored', function (rating: string) {
  // Click "Start flashcards" to fire onComplete with the result
  const startBtn = screen.queryByRole('button', { name: /start flashcards/i })
  if (startBtn) fireEvent.click(startBtn)

  const result = (this.onComplete as { called: boolean; result: { confidenceRating: string | null } | null })?.result
  if (!result) throw new Error('onComplete was not called — did you click "Start flashcards"?')
  if (result.confidenceRating !== rating) {
    throw new Error(`Expected confidenceRating="${rating}", got "${String(result.confidenceRating)}"`)
  }
})
