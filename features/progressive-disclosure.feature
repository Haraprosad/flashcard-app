Feature: Progressive disclosure — tier gating

  Background:
    Given the user is authenticated

  Scenario: T2 card is hidden until T1 is rated Good
    Given a concept "entropy" has T1, T2, and T3 cards
    And the T1 card has never been reviewed
    When the user starts a review session for "physics"
    Then only the T1 card appears in the session queue
    And the T2 and T3 cards are not in the queue

  Scenario: T3 card is hidden until T2 is rated Good
    Given a concept "entropy" has T1, T2, and T3 cards
    And the T1 card has been rated Good
    And the T2 card has never been reviewed
    When the user starts a review session for "physics"
    Then the T1 and T2 cards appear in the session queue
    And the T3 card is not in the queue

  Scenario: Card without concept_id is always shown
    Given the topic has 3 cards without concept_id at tiers 1, 2, and 3
    When the user starts a review session for "physics"
    Then all 3 cards appear in the session queue

  Scenario: Rating T1 as Again keeps T2 hidden
    Given a concept "entropy" has T1, T2, and T3 cards
    And the T1 card has been rated Again (lapses >= reps)
    When the user starts a review session for "physics"
    Then only the T1 card appears in the session queue

  Scenario: All tiers shown after sequential Good ratings
    Given a concept "entropy" has T1, T2, and T3 cards
    And the T1 card has been rated Good
    And the T2 card has been rated Good
    And the T3 card has never been reviewed
    When the user starts a review session for "physics"
    Then all 3 cards appear in the session queue

  Scenario: T1 card is always eligible regardless of state
    Given a concept "entropy" has T1, T2, and T3 cards
    And no cards have been reviewed
    When the user starts a review session for "physics"
    Then the T1 card appears in the session queue
