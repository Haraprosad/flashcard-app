Feature: Enhanced card types — standard, cloze, intuition

  Background:
    Given the user is authenticated

  Scenario: Standard card renders with question and answer
    Given the topic has 1 standard card loaded
    When the user starts a review session for "physics"
    Then the card front shows the question text
    And the card has tier badge "T1"

  Scenario: Cloze card renders with blanks on front
    Given the topic has 1 cloze card loaded with blank
    When the user starts a review session for "physics"
    Then the card front shows blanks (underlined ___)

  Scenario: Intuition card renders with Imagine prefix
    Given the topic has 1 intuition card loaded
    When the user starts a review session for "physics"
    Then the card front shows "Imagine:" prefix in amber

  Scenario: Card without type defaults to standard
    Given the topic has 1 legacy card without type or tier
    When the user starts a review session for "physics"
    Then the card front shows the question text
    And the card has tier badge "T1"

  Scenario: Flipping a cloze card shows highlighted text on back
    Given the topic has 1 cloze card loaded with blank
    And the review session is loaded
    When the user taps the card
    Then the card back shows the revealed text with highlighted segment

  Scenario: Tier badge color varies by tier
    Given the topic has 1 T2 card loaded
    When the user starts a review session for "physics"
    Then the card has tier badge "T2"

  Scenario: Intuition card back shows normal explanation
    Given the topic has 1 intuition card loaded
    And the review session is loaded
    When the user taps the card
    Then the card back shows the explanation text
