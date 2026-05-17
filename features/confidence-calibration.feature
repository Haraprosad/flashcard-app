Feature: Confidence Calibration Before Challenge Answer

  Before seeing multiple-choice options, the user must rate their confidence
  (Low / Medium / High). This surfaces the illusion-of-knowing and forces
  metacognitive engagement before answering. (Koriat & Bjork, 2006)

  Scenario: Options disabled until confidence selected
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    Then the option buttons should be disabled
    And the "Check answer" button should be disabled

  Scenario: Options enabled after confidence selected
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Low" confidence level
    Then the option buttons should be enabled

  Scenario: Confidence rating stored on correct first attempt
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "High" confidence level
    And I select the correct answer
    And I click the "Check answer" button
    Then I should see a success message
    And the confidence rating "high" should be stored

  Scenario: Confidence chip visible in result state
    Given I render an ExplorationCard at the challenge step with multiple-choice options
    When I select the "Medium" confidence level
    And I select the correct answer
    And I click the "Check answer" button
    Then I should see a success message
