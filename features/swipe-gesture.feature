Feature: Swipe cards to rate them

  Background:
    Given the review session is loaded with 2 due cards

  Scenario: Swipe right rates as Good
    Given the current card is showing its back
    When the user swipes the card to the right
    Then the card is rated "Good"

  Scenario: Swipe left rates as Again
    Given the current card is showing its back
    When the user swipes the card to the left
    Then the card is re-queued at the end

  Scenario: Short drag snaps back
    Given the current card is showing its back
    When the user performs a short drag to the right
    Then no rating is applied

  Scenario: Green overlay appears on right drag
    Given the current card is showing its back
    Then a swipe-right indicator is shown when dragging right

  Scenario: Red overlay appears on left drag
    Given the current card is showing its back
    Then a swipe-left indicator is shown when dragging left

  Scenario: Cannot swipe a face-down card
    Given the current card is showing its front
    When the user swipes the card to the right
    Then no rating is applied
