Feature: Lazy load topic files from Google Drive

  Scenario: Topic file is fetched when user navigates to topic
    Given the index has been loaded with topic "kubernetes"
    And "flashcards/kubernetes.json" is NOT in IndexedDB
    When the user taps the "Kubernetes" topic card
    Then a GET request is made for "kubernetes.json"
    And the response is stored in IndexedDB under key "kubernetes"
    And the topic detail page is shown with 48 cards

  Scenario: Topic file is served from cache when fresh
    Given "flashcards/kubernetes.json" was cached 2 hours ago
    And the index shows "kubernetes" last_modified 3 hours ago
    When the user taps the "Kubernetes" topic card
    Then NO GET request is made for "kubernetes.json"
    And the cached version is used

  Scenario: Topic file is re-fetched when stale
    Given "flashcards/kubernetes.json" was cached 2 hours ago
    And the index shows "kubernetes" last_modified 30 minutes ago
    When the user taps the "Kubernetes" topic card
    Then a GET request IS made for "kubernetes.json"
    And IndexedDB is updated with the fresh response

  Scenario: Only changed topics are re-fetched on sync
    Given the index has 3 topics: kubernetes, python, react
    And all 3 are cached in IndexedDB
    And the new index shows only "python" has a newer last_modified
    When the app opens
    Then only "python.json" is re-fetched from Drive
    And "kubernetes.json" and "react.json" are served from cache
