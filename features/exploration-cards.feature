Feature: Exploration Cards — Concept Formation Before Retrieval

  Exploration cards run once per concept before any FSRS flashcards for that
  concept are unlocked. They use a 4-step stepper (scenario → problem → guide
  → challenge) instead of the flip/swipe review flow.

  # ── Session Queue Gating ──────────────────────────────────────────────────

  Scenario: exploration card shown before T1 cards for unexplored concept
    Given I have a topic with an exploration card and T1 cards for concept "entropy"
    And the concept "entropy" has not been explored
    When I load a session for the topic
    Then the session queue should start with the exploration card for "entropy"
    And the session queue should not include FSRS cards for concept "entropy"

  Scenario: completing exploration unlocks T1 cards in current session
    Given I have a topic with an exploration card and T1 cards for concept "entropy"
    And the concept "entropy" has not been explored
    And I have loaded a session for the topic
    When I complete the exploration for concept "entropy"
    Then the concept "entropy" should be marked as explored
    And the session queue should now include the T1 cards for concept "entropy"

  Scenario: skipping exploration also marks concept explored
    Given I have a topic with an exploration card and T1 cards for concept "entropy"
    And the concept "entropy" has not been explored
    And I have loaded a session for the topic
    When I skip the exploration for concept "entropy"
    Then the concept "entropy" should be marked as explored

  Scenario: already-explored concept skips exploration entirely
    Given I have a topic with an exploration card and T1 cards for concept "entropy"
    And the concept "entropy" has been explored
    When I load a session for the topic
    Then the session queue should not contain any exploration cards
    And the session queue should include the T1 cards for concept "entropy"

  Scenario: card without concept_id always shown regardless of exploration state
    Given I have a topic with a standalone card and an exploration card for concept "entropy"
    And the concept "entropy" has not been explored
    When I load a session for the topic
    Then the session queue should include the standalone card

  Scenario: concept without exploration card shows T1 card directly
    Given I have a topic with only T1 cards for concept "entropy" (no exploration card)
    When I load a session for the topic
    Then the session queue should include the T1 cards for concept "entropy"

  # ── ExplorationCard Component ─────────────────────────────────────────────

  Scenario: ExplorationCard renders the scenario step by default
    Given I render an ExplorationCard with 4 steps
    Then I should see the exploration card
    And I should see the step indicator with 4 dots
    And I should see the scenario step body text
    And I should see a "Next" button
    And I should see a "Skip to flashcards" link

  Scenario: ExplorationCard advances through steps on Next click
    Given I render an ExplorationCard with 4 steps
    When I click the "Next" button
    Then I should see the problem step body text
    And the first indicator dot should be marked done

  Scenario: correct multiple-choice answer shows success
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the correct answer
    And I click the "Check answer" button
    Then I should see a success message
    And I should see a "Start flashcards" button

  Scenario: wrong multiple-choice answer shows explanation and retry
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select a wrong answer
    And I click the "Check answer" button
    Then I should see the challenge explanation text
    And I should see a "Try again" button

  Scenario: correct free-text answer (case-insensitive) shows success
    Given I render an ExplorationCard at the challenge step with free-text input
    When I type the correct answer in lower case
    And I click the "Check answer" button
    Then I should see a success message

  Scenario: Start flashcards button calls onComplete
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    And I have answered the challenge correctly
    When I click the "Start flashcards" button
    Then the onComplete callback should have been called

  Scenario: Skip to flashcards link calls onSkip
    Given I render an ExplorationCard with 4 steps
    When I click "Skip to flashcards"
    Then the onSkip callback should have been called
