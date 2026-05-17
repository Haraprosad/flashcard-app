Feature: SR State Persistence — IndexedDB + Drive Backup
  As a user who studies on multiple devices or clears browser data
  I want my SR state to be stored in IndexedDB and backed up to Drive
  So that my review progress is never lost

  Background:
    Given the SR state service is initialized with a clean state

  Scenario: SR state written to IndexedDB after rating a card
    Given a card with id "k8s-pods-0" has no SR data
    When I rate the card "k8s-pods-0" as "Good"
    Then the SR data for "k8s-pods-0" should be stored in IndexedDB

  Scenario: SR state loaded from IndexedDB on app reload
    Given the IndexedDB sr_state store contains SR data for card "k8s-pods-0"
    When the SR state service re-initializes from IndexedDB
    Then "k8s-pods-0" should be present in the in-memory SR cache

  Scenario: Drive SR state fetched and merged on login
    Given the local SR state has "k8s-pods-0" with reps 2
    And the Drive has "k8s-pods-0" with reps 4
    When the user signs in and a Drive merge runs
    Then the merged SR state should have "k8s-pods-0" with reps 4

  Scenario: Local state wins when it has more reps
    Given the local SR state has "k8s-pods-1" with reps 5
    And the Drive has "k8s-pods-1" with reps 3
    When the merge strategy runs
    Then the merged SR state should have "k8s-pods-1" with reps 5

  Scenario: Drive state wins when reps are equal and Drive is more recent
    Given the local SR state has "k8s-pods-2" with reps 3 last reviewed "2026-05-01"
    And the Drive has "k8s-pods-2" with reps 3 last reviewed "2026-05-10"
    When the merge strategy runs
    Then the merged SR state should use the Drive entry for "k8s-pods-2"

  Scenario: Push queued when offline, flag set in IDB
    Given the user is offline
    When a post-session push is attempted
    Then the IDB metadata "sr_state_pending_upload" should be true

  Scenario: Explored concepts survive Drive merge
    Given the local explored concepts include "entropy"
    And the Drive explored concepts include "recursion"
    When the merge strategy runs
    Then the merged explored concepts should include both "entropy" and "recursion"

  Scenario: localStorage migration runs on first IDB v2 open
    Given localStorage contains SR data for card "legacy-card-0"
    When the IndexedDB service opens for the first time at version 2
    Then the IDB sr_state store should contain the migrated entry for "legacy-card-0"
    And localStorage should no longer contain "sr_state"
