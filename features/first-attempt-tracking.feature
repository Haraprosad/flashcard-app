Feature: First-Attempt Tracking

  The first attempt on a challenge (correct vs. incorrect) produces a different
  memory trace than a retry success. Tracking this enables analytics on
  calibration quality and learning outcomes. (Generation effect nuance)

  Scenario: First-attempt correct recorded when answered right on first try
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "High" confidence level
    And I select the correct answer
    And I click the "Check answer" button
    And I click the "Start flashcards" button
    Then the onComplete result should have firstAttemptCorrect as true

  Scenario: First-attempt incorrect recorded when answered wrong then retried
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Low" confidence level
    And I select a wrong answer
    And I click the "Check answer" button
    And I click the "Try again" button
    And I select the "Medium" confidence level
    And I select the correct answer
    And I click the "Check answer" button
    And I click the "Start flashcards" button
    Then the onComplete result should have firstAttemptCorrect as false

  Scenario: First-try rate displayed in ProgressPage
    Given exploration records with 3 total and 2 first-attempt correct
    When I view the progress page
    Then I should see the first-try rate stat
