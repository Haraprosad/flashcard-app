# BDD-WORKFLOW.md — Flashcard App
> The complete Behavior-Driven Development workflow. Follow this file top to bottom.
> Rule: never write implementation code before you have a failing test.

---

## The Loop (burn this into muscle memory)

```
Write .feature (Gherkin) → Run → RED (undefined)
→ Write step definitions → Run → RED (pending)
→ Write minimum code → Run → GREEN
→ Refactor → Run → GREEN
→ Next feature
```

---

## Phase 0: Tooling Setup

### Install BDD dependencies

```bash
npm install --save-dev @cucumber/cucumber @cucumber/messages
npm install --save-dev ts-node @types/node
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/user-event
npm install --save-dev playwright @playwright/test
npm install --save-dev identity-obj-proxy
```

### cucumber.js (project root)

```js
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: ['progress-bar', 'html:reports/cucumber.html'],
    publishQuiet: true,
  },
};
```

### vitest.config.ts

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    moduleNameMapper: {
      '\\.(css|less|scss)$': 'identity-obj-proxy',
    },
  },
});
```

### package.json scripts (add these)

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:bdd": "cucumber-js",
  "test:e2e": "playwright test",
  "test:all": "npm run test && npm run test:bdd && npm run test:e2e"
}
```

### Verify setup

```bash
npm run test:bdd
# Expected: 0 scenarios, 0 steps — BDD runner is live
```

---

## Feature 1: Google OAuth Authentication

### features/auth.feature

```gherkin
Feature: Google OAuth sign-in

  Background:
    Given the app is loaded at "/"

  Scenario: Unauthenticated user is redirected to login
    Given the user is not signed in
    When the app loads
    Then the user sees the login page
    And there is a "Sign in with Google" button

  Scenario: User signs in with Google
    Given the user is on the login page
    When the user clicks "Sign in with Google"
    And Google OAuth succeeds with email "user@example.com"
    Then the user is redirected to "/topics"
    And the access token is stored in memory only
    And the access token is NOT stored in localStorage

  Scenario: Access token is never persisted to localStorage
    Given the user has signed in
    Then localStorage does not contain a key matching "token"
    And localStorage does not contain a key matching "access"

  Scenario: Expired token triggers silent re-auth
    Given the user is signed in
    When the access token expires
    Then a silent re-auth is attempted
    And if silent re-auth fails the user is redirected to "/login"

  Scenario: User signs out
    Given the user is signed in and on "/topics"
    When the user clicks "Sign out"
    Then the access token is cleared from memory
    And the user is redirected to "/login"
```

### features/step_definitions/auth.steps.ts (skeleton)

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect } from 'vitest';

Given('the app is loaded at {string}', async function(path: string) {
  // render App with MemoryRouter at path
  this.path = path;
});

Given('the user is not signed in', function() {
  this.authStore = { accessToken: null };
});

When('the app loads', async function() {
  // render with mock auth store
});

Then('the user sees the login page', function() {
  expect(screen.getByTestId('login-page')).toBeInTheDocument();
});

Then('there is a {string} button', function(label: string) {
  expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
});

Then('the access token is stored in memory only', function() {
  // verify zustand store has token
  expect(this.authStore.accessToken).toBeTruthy();
});

Then('the access token is NOT stored in localStorage', function() {
  const keys = Object.keys(localStorage);
  const hasToken = keys.some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('access'));
  expect(hasToken).toBe(false);
});
```

---

## Feature 2: Fetch Index and Lazy-Load Topic Files

### features/index-fetch.feature

```gherkin
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
```

### features/topic-lazy-load.feature

```gherkin
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
```

---

## Feature 3: Topic Browser

### features/topic-browser.feature

```gherkin
Feature: Browse and search topics

  Background:
    Given the user is authenticated
    And the index has been loaded with topics: kubernetes, python, react, system-design

  Scenario: All topics are displayed as cards
    When the user is on "/topics"
    Then 4 topic cards are visible
    And each card shows the topic name, card count, and due count

  Scenario: Due-today badge shows correctly
    Given the SR state has 5 cards due today for topic "kubernetes"
    When the topic browser loads
    Then the "Kubernetes" card shows a badge "5 due"
    And the "Python" card does not show a due badge if 0 are due

  Scenario: Mastery bar reflects SR state
    Given 24 of 48 kubernetes cards have state=Review and reps>=3
    When the topic browser loads
    Then the "Kubernetes" card mastery bar is at 50%

  Scenario: Search filters topics
    Given the topic browser is visible
    When the user types "kub" in the search bar
    Then only the "Kubernetes" topic card is visible
    And the other 3 cards are hidden

  Scenario: Search is case-insensitive
    When the user types "PYTHON" in the search bar
    Then the "Python" topic card is visible

  Scenario: Empty search state
    When the user types "zzz" in the search bar
    Then no topic cards are visible
    And an "No topics found" message is shown

  Scenario: "Review all due" button
    Given multiple topics have due cards
    When the user taps "Review all due"
    Then the user navigates to "/review/all"
```

---

## Feature 4: Review Session

### features/card-review.feature

```gherkin
Feature: Review flashcards in a session

  Background:
    Given the user is authenticated
    And the "kubernetes" topic has been loaded with 10 cards
    And 5 of those cards are due today

  Scenario: Session loads only due cards
    When the user starts a review session for "kubernetes"
    Then the session queue has 5 cards
    And the first card is shown face-down (front only)

  Scenario: New cards are included in session
    Given 3 cards have never been reviewed (state=New)
    When the user starts a review session
    Then those 3 new cards are included in the queue

  Scenario: New cards are capped at 20 per session
    Given 30 cards have never been reviewed
    When the user starts a review session
    Then only 20 new cards are in the session queue

  Scenario: Card flip reveals the back
    Given a card is showing its front
    When the user taps the card
    Then the card flips to show the back
    And the RatingBar appears with 4 buttons

  Scenario: Rating a card as "Good"
    Given a card is showing its back
    When the user taps "Good"
    Then the FSRS algorithm is called with rating=Good
    And the SR state for that card is updated in localStorage
    And the card animates off screen to the right
    And the next card slides in

  Scenario: Rating a card as "Again" re-queues it
    Given a card is showing its back
    When the user taps "Again"
    Then the card is added back to the end of the session queue
    And the card animates off screen to the left

  Scenario: RatingBar shows next interval preview
    Given a card is showing its back
    Then the "Good" button shows the next interval (e.g. "3d")
    And the "Easy" button shows a longer interval
    And the "Again" button shows "10 min"

  Scenario: Session ends when queue is empty
    Given only 1 card remains in the session queue
    When the user rates that card
    Then the SessionComplete screen is shown
    And it displays the count of cards reviewed
    And it shows the next due date for this topic

  Scenario: Keyboard shortcuts work in review
    Given a card is showing its front
    When the user presses Space
    Then the card flips to show the back
    Given the card is showing its back
    When the user presses "3"
    Then the card is rated "Good"
```

---

## Feature 5: Swipe Gesture

### features/swipe-gesture.feature

```gherkin
Feature: Swipe cards to rate them

  Scenario: Swipe right rates as Good
    Given a card is showing its back
    When the user drags the card 90px to the right and releases
    Then the card is rated "Good"
    And the card exits to the right with rotation

  Scenario: Swipe left rates as Again
    Given a card is showing its back
    When the user drags the card 90px to the left and releases
    Then the card is rated "Again"
    And the card exits to the left with negative rotation

  Scenario: Short drag snaps back
    Given a card is showing its back
    When the user drags the card 30px to the right and releases
    Then the card snaps back to center
    And no rating is applied

  Scenario: Green overlay appears on right drag
    Given a card is showing its back
    When the user is dragging the card to the right
    Then a green tint overlay appears on the card
    And the overlay opacity increases proportionally to drag distance

  Scenario: Red overlay appears on left drag
    Given a card is showing its back
    When the user is dragging the card to the left
    Then a red tint overlay appears on the card

  Scenario: Cannot swipe a face-down card
    Given a card is showing its front (not yet flipped)
    When the user tries to swipe the card
    Then the swipe has no effect
    And no rating is applied
```

---

## Feature 6: FSRS Scheduling

### features/fsrs-scheduling.feature

```gherkin
Feature: FSRS spaced repetition scheduling

  Scenario: New card rated Good gets interval of 1 day
    Given a card with state=New (never reviewed)
    When the card is rated "Good"
    Then the card's state changes to Learning
    And the next review is scheduled approximately 1 day from now

  Scenario: New card rated Easy gets longer interval
    Given a card with state=New
    When the card is rated "Easy"
    Then the next review interval is greater than 1 day

  Scenario: Reviewed card rated Again resets
    Given a card with state=Review and stability=10
    When the card is rated "Again"
    Then the card's state changes to Relearning
    And the lapses count increases by 1
    And the next review is scheduled for 10 minutes from now

  Scenario: Stability increases on Good rating for Review card
    Given a card with state=Review and stability=5.0
    When the card is rated "Good"
    Then the new stability is greater than 5.0

  Scenario: SR state is persisted to localStorage immediately
    Given a card is being reviewed
    When any rating is applied
    Then localStorage["sr_state"] is updated within the same tick
    And the update is not debounced or deferred

  Scenario: SR state survives page refresh
    Given the user has reviewed 10 cards
    When the user refreshes the page
    Then all 10 cards still show their updated SR state
    And the session queue is recalculated from the persisted state

  Scenario: Card IDs are stable across re-syncs
    Given "kubernetes.json" was synced with card id "kubernetes-pods-0"
    When the sync script runs again without changing the pods.md file
    Then the card id is still "kubernetes-pods-0"
    And the SR state for that card is preserved
```

---

## Feature 7: Progress Dashboard

### features/progress.feature

```gherkin
Feature: Progress tracking and dashboard

  Scenario: Streak increments after first review of the day
    Given the user has not reviewed any cards today
    And the current streak is 3
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
    And the current streak is 5
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
```

---

## Feature 8: Offline Support

### features/offline.feature

```gherkin
Feature: App works offline after first load

  Scenario: Review session works fully offline
    Given the user has previously loaded the "kubernetes" topic
    And IndexedDB contains the kubernetes topic cards
    And SR state is in localStorage
    When the device goes offline
    When the user navigates to "/review/kubernetes"
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
```

---

## Phase: End-to-End Tests (Playwright)

### e2e/full-review-session.spec.ts (write after all features are green)

```typescript
import { test, expect } from '@playwright/test';

test.describe('complete review session', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Google OAuth
    await page.route('**/oauth2/**', route => {
      route.fulfill({ body: JSON.stringify({ access_token: 'mock-token', email: 'test@example.com' }) });
    });
    // Mock Drive index.json
    await page.route('**/drive/v3/files**index**', route => {
      route.fulfill({ body: JSON.stringify({ files: [{ id: 'idx-1', name: 'index.json' }] }) });
    });
  });

  test('user can complete a full review session', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="google-signin-btn"]');
    await expect(page.locator('[data-testid="topic-browser"]')).toBeVisible();

    await page.click('[data-testid="topic-card-kubernetes"]');
    await expect(page.locator('[data-testid="topic-detail"]')).toBeVisible();

    await page.click('[data-testid="start-review-btn"]');
    await expect(page.locator('[data-testid="flash-card"]')).toBeVisible();

    // Flip the card
    await page.click('[data-testid="flash-card"]');
    await expect(page.locator('[data-testid="rating-bar"]')).toBeVisible();

    // Rate as Good
    await page.click('[data-testid="rate-good"]');
    await expect(page.locator('[data-testid="flash-card"]')).toBeVisible();
  });

  test('session complete screen appears after all cards reviewed', async ({ page }) => {
    // ... setup with exactly 1 card in session
    await page.goto('/review/kubernetes');
    await page.click('[data-testid="flash-card"]');
    await page.click('[data-testid="rate-easy"]');
    await expect(page.locator('[data-testid="session-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="cards-reviewed-count"]')).toContainText('1');
  });

  test('swipe right rates as Good', async ({ page }) => {
    await page.goto('/review/kubernetes');
    await page.click('[data-testid="flash-card"]'); // flip first
    const card = page.locator('[data-testid="flash-card"]');
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 100, box!.y + box!.height / 2);
    await page.mouse.up();
    // Card should exit and next card appears
    await expect(page.locator('[data-testid="flash-card"]')).toBeVisible();
  });
});
```

---

## Red-Green-Refactor Log

Track your BDD progress here. Check off as you go.

### Feature 1: Auth
- [ ] RED: `npm run test:bdd -- --tags @auth` → undefined steps
- [ ] Step defs written
- [ ] RED: pending implementations
- [ ] GREEN: `authStore`, `LoginPage`, `GoogleSignInButton` implemented
- [ ] Refactor: extract `useAuth` hook

### Feature 2: Index Fetch
- [ ] RED → Step defs → RED → GREEN: `gdriveService.fetchIndex()`
- [ ] Refactor: add retry logic, Zod validation of index shape

### Feature 3: Topic Lazy Load
- [ ] RED → Step defs → RED → GREEN: `gdriveService.fetchTopic()`, `indexedDBService`
- [ ] Refactor: freshness check logic into `srStateService`

### Feature 4: Topic Browser
- [ ] RED → Step defs → RED → GREEN: `TopicBrowserPage`, `TopicCard`, `SearchBar`
- [ ] Refactor: memoize filtered topics, debounce search

### Feature 5: Review Session
- [ ] RED → Step defs → RED → GREEN: `ReviewSessionPage`, `SwipeCardStack`, `FlashCard`, `RatingBar`
- [ ] Refactor: extract `useReview` hook

### Feature 6: Swipe Gesture
- [ ] RED → Step defs → RED → GREEN: swipe logic in `SwipeCardStack`
- [ ] Refactor: velocity-aware exit, snap-back threshold

### Feature 7: FSRS
- [ ] RED → Step defs → RED → GREEN: `fsrsService`, `srStateService`
- [ ] Refactor: batch localStorage writes

### Feature 8: Progress
- [ ] RED → Step defs → RED → GREEN: `ProgressPage`, `StreakWidget`, `ReviewHeatmap`
- [ ] Refactor: memoize heatmap computation

### Feature 9: Offline
- [ ] RED → Step defs → RED → GREEN: `useOfflineStatus`, `OfflineBanner`
- [ ] Refactor: service worker consideration (optional)

---

## Commands Reference

```bash
# Run all BDD feature files
npm run test:bdd

# Run specific feature
npm run test:bdd -- --tags @auth
npm run test:bdd -- --tags @review

# Run unit tests
npm run test

# Run E2E
npm run test:e2e

# Run everything (pre-commit)
npm run test:all

# Watch mode
npm run test:watch

# BDD HTML report
open reports/cucumber.html
```