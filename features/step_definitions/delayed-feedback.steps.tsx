import { When, Then } from '@cucumber/cucumber'
import { screen, fireEvent } from '@testing-library/react'

// Reuses from exploration-cards.steps.tsx:
//   Given I render an ExplorationCard at the challenge step with multiple-choice options
//   When I select the {string} confidence level  (confidence-calibration.steps.tsx)
//   When I select a wrong answer
//   When I click the {string} button
// Reuses from exploration-cards.steps.tsx:
//   Then I should see {string} message
//   Then I should see the {string} button

Then('the challenge explanation should be hidden', function () {
  const explanation = screen.queryByTestId('challenge-explanation')
  if (explanation) throw new Error('Challenge explanation is visible but should be hidden')
})

When('I see the explanation', function () {
  // Just verify the explanation is already visible (caller clicked "See why" previously)
  const explanation = screen.queryByTestId('challenge-explanation')
  if (!explanation) throw new Error('Challenge explanation is not visible')
})
