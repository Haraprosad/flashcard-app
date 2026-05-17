Feature: Exploration Skip Friction

  Moving "Skip to flashcards" behind a ⋯ overflow menu forces learners to
  consciously choose to bypass exploration rather than skip it reflexively.
  Desirable difficulties only work if the difficulty is actually imposed.
  (Bjork & Bjork, 2011)

  Scenario: Skip link not visible in primary button area
    Given I render an ExplorationCard with 4 steps
    Then I should not see a link with text "Skip to flashcards"

  Scenario: Overflow menu opens on tap
    Given I render an ExplorationCard with 4 steps
    When I click the overflow menu button
    Then I should see "Skip building the mental model?" message

  Scenario: Confirmation shows Keep going and Skip anyway buttons
    Given I render an ExplorationCard with 4 steps
    When I click the overflow menu button
    Then I should see a "Keep going" button
    And I should see a "Skip anyway" button

  Scenario: Keep going dismisses the dialog
    Given I render an ExplorationCard with 4 steps
    When I click the overflow menu button
    And I click the "Keep going" button
    Then I should not see "Skip building the mental model?" message

  Scenario: Skip anyway calls onSkip and advances
    Given I render an ExplorationCard with 4 steps
    When I click the overflow menu button
    And I click the "Skip anyway" button
    Then the onSkip callback should have been called
