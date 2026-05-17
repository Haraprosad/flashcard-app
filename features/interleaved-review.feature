Feature: Tier-Respecting Interleave Shuffle

  Interleaved card order (T1-A, T1-B, T2-A, T2-B) produces better delayed
  recall than blocked ordering. Within each tier, cards from different concepts
  alternate. Exploration cards always stay at position 0.
  (Rohrer & Taylor, 2007)

  Scenario: All T1 cards appear before any T2 cards
    Given I have cards with T1 and T2 tiers
    When I interleave the cards
    Then all T1 cards should come before any T2 cards

  Scenario: Cards from different concepts alternate within the same tier
    Given I have T1 cards from two different concepts
    When I interleave the cards
    Then the T1 cards should alternate between concepts

  Scenario: Exploration card always placed first
    Given I have an exploration card and T1 flashcards
    When I interleave the cards
    Then the first card should be the exploration card
