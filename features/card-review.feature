Feature: Review flashcards in a session

  Background:
    Given the user is authenticated
    And the "kubernetes" topic has been loaded with 10 cards
    And 5 of those cards are due today

  Scenario: Session loads only due cards
    When the user starts a review session for "kubernetes"
    Then the session queue has 5 cards
    And the first card is shown face-down (front only)

  Scenario: New cards are included in session
    Given 3 cards have never been reviewed (state=New)
    When the user starts a review session for "kubernetes"
    Then those 3 new cards are included in the queue

  Scenario: New cards are capped at 20 per session
    Given 30 cards have never been reviewed
    When the user starts a review session for "kubernetes"
    Then only 20 new cards are in the session queue

  Scenario: Card flip reveals the back
    Given the review session is loaded with 1 due card
    When the user taps the card
    Then the card flips to show the back
    And the RatingBar appears with 4 buttons

  Scenario: Rating a card as "Good"
    Given the review session is loaded with 2 due cards
    And the current card is showing its back
    When the user taps the "Good" rating button
    Then the SR state for that card is updated in localStorage
    And the next card is shown

  Scenario: Rating a card as "Again" re-queues it
    Given the review session is loaded with 1 due card
    And the current card is showing its back
    When the user taps the "Again" rating button
    Then the card is added back to the end of the session queue

  Scenario: RatingBar shows next interval preview
    Given the review session is loaded with 1 due card
    And the current card is showing its back
    Then the rating buttons show interval previews

  Scenario: Session ends when queue is empty
    Given the review session is loaded with 1 due card
    And the current card is showing its back
    When the user taps the "Good" rating button
    Then the SessionComplete screen is shown
    And it displays the count of cards reviewed

  Scenario: Keyboard shortcuts work in review
    Given the review session is loaded with 1 due card
    When the user presses the Space key
    Then the card flips to show the back
    When the user presses the "3" key
    Then the card is rated "Good"
