Feature: Browse and search topics

  Background:
    Given the user is authenticated with a valid token
    And the index has been loaded with topics: kubernetes, python, react, system-design

  Scenario: All topics are displayed as cards
    When the user is on "/topics"
    Then 4 topic cards are visible
    And each card shows the topic name and card count

  Scenario: Due-today badge shows correctly
    Given the SR state has 5 cards due today for topic "kubernetes"
    When the topic browser loads
    Then the "Kubernetes" card shows a badge with "5 due"
    And the "Python" card does not show a due badge

  Scenario: Mastery bar reflects SR state
    Given 24 of 48 kubernetes cards have state=Review and reps>=3
    When the topic browser loads
    Then the "Kubernetes" card mastery bar is at 50%

  Scenario: Search filters topics
    Given the topic browser is visible
    When the user types "kub" in the search bar
    Then only the "Kubernetes" topic card is visible

  Scenario: Search is case-insensitive
    Given the topic browser is visible
    When the user types "PYTHON" in the search bar
    Then the "Python" topic card is visible

  Scenario: Empty search state
    Given the topic browser is visible
    When the user types "zzz" in the search bar
    Then no topic cards are visible
    And an empty state message is shown

  Scenario: "Review all due" button navigates to review-all route
    Given multiple topics have due cards
    And the topic browser is visible
    When the user taps "Review all due"
    Then the user navigates to "/review/all"
