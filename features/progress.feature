Feature: Progress tracking and dashboard

  Scenario: Streak increments after first review of the day
    Given the user has not reviewed any cards today
    And the current streak is set to 3
    When the user completes at least 1 card review
    Then the streak becomes 4
    And "last_review_date" in localStorage is set to today

  Scenario: Streak resets if a day is skipped
    Given "last_review_date" is 2 days ago
    When the progress page loads
    Then the current streak is 0
    And the longest streak is preserved

  Scenario: Streak does not increment twice in same day
    Given the user has already reviewed cards today
    And the current streak is set to 5
    When the user reviews more cards
    Then the streak remains 5

  Scenario: Heatmap shows 90 days of data
    Given the user has review log entries for the last 90 days
    When the progress page loads
    Then the heatmap shows 90 cells
    And each cell reflects the review count for that day

  Scenario: Heatmap cell colors reflect intensity
    Given a day with 0 reviews
    Then that cell is gray
    Given a day with 5 reviews
    Then that cell is medium green
    Given a day with 12 reviews
    Then that cell is dark green

  Scenario: Per-topic mastery calculation
    Given "kubernetes" has 48 cards
    And 24 cards have state=Review and reps>=3
    When the progress page loads
    Then the "Kubernetes" mastery percentage is 50%

  Scenario: Total stats are correct
    Given the review_log shows 250 total reviews
    When the progress page loads
    Then the total reviews stat shows 250
