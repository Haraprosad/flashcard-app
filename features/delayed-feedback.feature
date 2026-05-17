Feature: Delayed Explanation Reveal on Wrong Answer

  When a user gets the challenge wrong, the explanation is NOT shown immediately.
  Instead a "See why →" button appears. Only after tapping it does the explanation
  slide in. A brief delay before corrective feedback improves long-term retention.
  (Butler et al., 2007)

  Scenario: Explanation hidden on wrong answer
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Low" confidence level
    And I select a wrong answer
    And I click the "Check answer" button
    Then I should see "No, you are wrong" message
    And the challenge explanation should be hidden

  Scenario: "See why" button visible on wrong answer
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Low" confidence level
    And I select a wrong answer
    And I click the "Check answer" button
    Then I should see the "See why" button

  Scenario: Explanation revealed after tapping "See why"
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Low" confidence level
    And I select a wrong answer
    And I click the "Check answer" button
    And I click the "See why" button
    Then I should see the challenge explanation text

  Scenario: Explanation resets to hidden on "Try again"
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Low" confidence level
    And I select a wrong answer
    And I click the "Check answer" button
    And I click the "See why" button
    And I see the explanation
    And I click the "Try again" button
    Then the challenge explanation should be hidden
