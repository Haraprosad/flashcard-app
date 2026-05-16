Feature: FSRS spaced repetition scheduling

  Scenario: New card rated Good gets scheduled in the future
    Given a card with state=New (never reviewed)
    When the fsrs service rates that card as "Good"
    Then the card's state is no longer New
    And the next review is scheduled in the future

  Scenario: New card rated Easy gets a longer interval than Good
    Given a card with state=New
    When the fsrs service rates that card as "Good" and records the interval
    And the fsrs service rates that card as "Easy" from New state
    Then the Easy interval is greater than or equal to the Good interval

  Scenario: Reviewed card rated Again resets to Relearning
    Given a card with state=Review and stability=10
    When the fsrs service rates that card as "Again"
    Then the card's state changes to Relearning
    And the lapses count increases by 1

  Scenario: Stability increases on Good rating for Review card
    Given a card with state=Review and stability=5.0
    When the fsrs service rates that card as "Good"
    Then the new stability is greater than 5.0

  Scenario: SR state is persisted to localStorage immediately
    Given a card is being reviewed in a session
    When any rating is applied to the card
    Then localStorage sr_state is updated synchronously

  Scenario: SR state survives page refresh
    Given the user has reviewed cards in a session
    When the review store is re-initialized
    Then the SR state from localStorage is still present

  Scenario: Card IDs are stable across re-syncs
    Given a card with id "kubernetes-pods-0" is in SR state
    Then the SR state entry for "kubernetes-pods-0" is preserved
