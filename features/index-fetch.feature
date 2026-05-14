Feature: Fetch flashcards index from Google Drive

  Scenario: App fetches index.json on startup
    Given the user is authenticated with a valid token
    And Google Drive contains "flashcards/index.json" in "ObsidianSecondBrain"
    When the app navigates to "/topics"
    Then a GET request is made to the Google Drive files API
    And the query includes name='index.json'
    And the topics list is populated from the response

  Scenario: Index shows correct topic metadata
    Given "flashcards/index.json" contains 3 topics
      | topic      | slug       | card_count |
      | Kubernetes | kubernetes | 48         |
      | Python     | python     | 62         |
      | React      | react      | 35         |
    When the topic browser loads
    Then 3 topic cards are visible
    And the "Kubernetes" card shows "48 cards"

  Scenario: Drive is unreachable on startup
    Given the user is authenticated
    And Google Drive returns a network error
    And IndexedDB has a cached index
    When the app navigates to "/topics"
    Then the cached index is used
    And an OfflineBanner is shown

  Scenario: Drive is unreachable and no cache exists
    Given the user is authenticated
    And Google Drive returns a network error
    And IndexedDB has no cached index
    When the app navigates to "/topics"
    Then an error state is shown
    And a "Retry" button is visible
