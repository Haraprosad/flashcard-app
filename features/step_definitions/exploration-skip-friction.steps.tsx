import React from 'react'
import { Then } from '@cucumber/cucumber'
import { screen, waitFor } from '@testing-library/react'

// All Given/When steps reuse definitions from exploration-cards.steps.tsx:
//   Given I render an ExplorationCard with 4 steps
//   When I click the overflow menu button
//   When I click the {string} button
//   Then the onSkip callback should have been called
//   Then I should not see a link with text {string}
//   Then I should see {string} message
//   Then I should see a {string} button

Then('I should not see {string} message', async function (text: string) {
  // Use waitFor to handle Framer Motion AnimatePresence exit animation
  await waitFor(() => {
    if (screen.queryByText(new RegExp(text, 'i'))) {
      throw new Error(`"${text}" should not be visible`)
    }
  }, { timeout: 2000 })
})
