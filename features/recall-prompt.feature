Feature: Pre-Session Recall Prompt

  Before the first flashcard in a single-topic session, a full-screen prompt
  asks the user to mentally recall what they know about the topic.
  This activates prior knowledge and strengthens subsequent encoding.
  (Roediger & Karpicke, 2006)

  Scenario: Recall prompt shown at session start for topic with cards
    Given I have a topic "entropy" with more than one card
    And I start a review session for "entropy" in "review" mode
    Then I should see the recall prompt
    And I should see the "I've thought about it" continue button

  Scenario: Recall prompt not shown for /review/all
    Given I have cards across multiple topics
    And I start a session for slug "all"
    Then I should not see the recall prompt

  Scenario: Recall prompt not shown in fresh mode
    Given I have a topic "entropy" with more than one card
    And I start a review session for "entropy" in "fresh" mode
    Then I should not see the recall prompt

  Scenario: Cards begin after continue tapped
    Given I have a topic "entropy" with more than one card
    And I start a review session for "entropy" in "review" mode
    And I see the recall prompt
    When I click the recall continue button
    Then I should not see the recall prompt
