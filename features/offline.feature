Feature: App works offline after first load

  Scenario: Review session works fully offline
    Given the user has previously loaded the "kubernetes" topic
    And IndexedDB contains the kubernetes topic cards
    And SR state is in localStorage
    When the device goes offline
    When the user opens the review session for "kubernetes"
    Then the review session starts normally
    And rating cards works and persists to localStorage

  Scenario: OfflineBanner shows when Drive is unreachable
    Given the device is offline
    When the user opens the app
    Then the OfflineBanner is visible
    And it shows the time since last successful sync

  Scenario: Topic browser loads from cache when offline
    Given all topics have been cached in IndexedDB
    And the device is offline
    When the user opens the app
    Then the topic browser shows all cached topics
    And each topic card shows data from the cache

  Scenario: Uncached topic shows appropriate message offline
    Given "react" has never been fetched
    And the device is offline
    When the user taps the "React" topic card
    Then an error message is shown: "This topic hasn't been downloaded yet"
    And a "Sync when online" message is shown
