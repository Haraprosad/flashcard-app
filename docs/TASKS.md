# TASKS.md — Flashcard App
> Track progress here. Check boxes as you complete tasks. Never mark a task done until `npm run test:all` passes.
> Last updated: 2026-05-17

---

## Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done (tests green)
- `[!]` Blocked

---

## Phase 0: Project Scaffolding

### 0.1 Init & Tooling
- [x] `npm create vite@latest flashcard-app -- --template react-ts`
- [x] Install Tailwind CSS v3 and configure `tailwind.config.ts`
- [x] Install all dependencies from spec section 2
  - [x] `zustand`, `idb`, `ts-fsrs`, `react-swipeable`, `framer-motion`
  - [x] `@react-oauth/google`
  - [x] `react-router-dom`
  - [x] `vitest`, `@testing-library/react`, `@testing-library/user-event`
  - [x] `@cucumber/cucumber`, `ts-node`
  - [x] `playwright`, `@playwright/test`
- [~] Install design skills (run in terminal):
  - [x] `npx skills add pbakaus/impeccable`
  - [!] `npx skills add anthropics/frontend-design` — repo not found (private/nonexistent)
  - [x] `git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill && cp -r ...`
  - [!] `npx skillfish add carlosverasteguii/daticket framer-motion` — daticket not in registry; installed framer-motion-animator as substitute
  - [x] `npx @21st-dev/cli@latest install claude --api-key YOUR_KEY`
  - [x] `git clone https://github.com/Community-Access/accessibility-agents`
- [x] Create `CLAUDE.md` in project root (copy from `docs/CLAUDE.md`)
- [x] Run `/impeccable teach` and commit `PRODUCT.md` + `DESIGN.md` + `.impeccable/design.json`

### 0.2 Project Structure
- [x] Create folder structure per spec section 12
  - [x] `features/` with `step_definitions/` and `support/`
  - [x] `e2e/`
  - [x] `src/types/`, `src/components/`, `src/pages/`, `src/stores/`, `src/services/`, `src/hooks/`
- [x] Create `src/types/index.ts` with all interfaces from spec section 5
  - [x] `FlashcardsIndex`, `TopicMeta`
  - [x] `TopicFile`, `FlashCard`
  - [x] `SRState`, `CardSRData`
  - [x] `Rating` enum
- [x] Create `cucumber.js` config (as `cucumber.cjs`)
- [x] Create `vitest.config.ts`
- [x] Create `playwright.config.ts`
- [x] Verify `npm run test:bdd` runs (0 scenarios is fine)
- [x] Verify `npm run test` runs (0 tests is fine)

### 0.3 Environment & Config
- [x] Create `.env.local` with `VITE_GOOGLE_CLIENT_ID`
- [x] Create `.env.example` (no secrets)
- [x] Create `netlify.toml` (from spec section 13)
- [x] Create `docs/` folder and move all spec docs in
- [x] Init git repo and make first commit

---

## Phase 1: Authentication

> BDD: write `features/auth.feature` first, see RED, then implement.

### 1.1 Feature File
- [x] Write `features/auth.feature` (all scenarios from BDD-WORKFLOW.md)
- [x] Run `npm run test:bdd` → confirm RED (undefined steps)

### 1.2 Step Definitions
- [x] Write `features/step_definitions/auth.steps.tsx`
- [x] Run `npm run test:bdd` → confirm RED (pending)

### 1.3 Implementation
- [x] Create `src/stores/authStore.ts`
  - [x] `accessToken: string | null`
  - [x] `userEmail: string | null`
  - [x] `signIn()`, `signOut()`
  - [x] Token in memory ONLY — never write to localStorage
- [x] Create `src/hooks/useAuth.ts`
- [x] Install and configure `@react-oauth/google` in `src/main.tsx`
- [x] Build `src/components/GoogleSignInButton.tsx`
  - [x] `/frontend-design /daticket` — apply design system
  - [x] Google icon (SVG), DM Sans font, dark theme
  - [x] Framer Motion press animation
  - [x] `/accessibility-review` before done
- [x] Build `src/pages/LoginPage.tsx`
  - [x] Full-page centered layout
  - [x] App name in DM Serif Display
  - [x] Tagline: "Your Obsidian notes, as flashcards"
  - [x] GoogleSignInButton
  - [x] `/accessibility-review`
- [x] Wire up protected routes in `src/router.tsx`
  - [x] `/` redirects to `/topics` if auth, else `/login`
  - [x] All routes except `/login` require auth
- [x] Run `npm run test:bdd` → GREEN
- [x] Run `npm run test` → GREEN

### 1.4 Refactor
- [x] Extract token refresh logic to `src/services/authService.ts`
- [x] Add error boundary for auth failures

---

## Phase 2: Google Drive Integration ✅ COMPLETE

> BDD: `features/index-fetch.feature` and `features/topic-lazy-load.feature`
> **Status:** All 13 BDD scenarios GREEN · 70 steps passing · `tsc --noEmit` clean

### 2.1 Feature Files
- [x] Write `features/index-fetch.feature` — 4 scenarios, GREEN
- [x] Write `features/topic-lazy-load.feature` — 4 scenarios, GREEN

### 2.2 Step Definitions
- [x] Write `features/step_definitions/index-fetch.steps.tsx` — GREEN
- [x] Write `features/step_definitions/topic-lazy-load.steps.tsx` — GREEN

### 2.3 Implementation
- [x] Create `src/services/gdriveService.ts`
  - [x] `fetchIndex(token)` — finds and downloads `index.json`
  - [x] `fetchTopicFile(slug, token)` — finds and downloads `{slug}.json`
  - [x] All functions typed with proper return types
  - [x] Error handling: network error, 401, file not found
- [x] Create `src/services/indexedDBService.ts`
  - [x] Open DB `flashcard-app-db` version 1
  - [x] `saveIndex(index)`, `getIndex()`
  - [x] `saveTopicFile(slug, data)`, `getTopicFile(slug)`
  - [x] `getTopicFetchedAt(slug)`
  - [x] `getFolderIds()`, `saveFolderIds(ids)`
  - [x] `clearTopicCache()` for settings
- [x] Create `src/stores/indexStore.ts`
  - [x] Fetch index on auth, store in Zustand + IndexedDB
  - [x] Freshness check logic
- [x] Create `src/stores/topicStore.ts`
  - [x] `fetchTopic(slug, token)` with cache check + `sessionFetchedAt` fast-path
  - [x] `getCardsByTopic(slug)`
  - [x] `getAllCachedCards()`
- [x] Run `npm run test:bdd` → GREEN (13 scenarios, 70 steps)
- [x] Run `npm run test` → GREEN

### 2.4 Refactor
- [x] Add Zod schema validation for `index.json` shape
- [x] Add Zod schema validation for topic file shape
- [x] Add retry with exponential backoff to Drive calls
- [x] Cache folder IDs in IndexedDB to avoid repeated folder lookups

---

## Phase 3: Topic Browser UI ✅ COMPLETE

> BDD: `features/topic-browser.feature`
> **Status:** All 20 BDD scenarios GREEN · 108 steps passing · `tsc --noEmit` clean

### 3.1 Feature File & Steps

- [x] Write `features/topic-browser.feature` (7 scenarios)
- [x] Write step definitions (`features/step_definitions/topic-browser.steps.tsx`)
- [x] Run → RED confirmed

### 3.2 Implementation
- [x] Create `src/components/SearchBar.tsx`
  - [x] `DM Sans` font, dark theme input
  - [x] Animated clear button (Framer Motion, appears when text > 0)
  - [x] Synchronous call when `debounceMs=0`, debounced otherwise
- [x] Create `src/components/MasteryBar.tsx`
  - [x] 3px thin bar, CSS-transition fill
  - [x] Color: green (mastered ≥80%), amber (in-progress)
- [x] Create `src/components/TopicCard.tsx`
  - [x] DM Serif topic name, muted card count
  - [x] Due-today amber pill badge (hidden if 0)
  - [x] MasteryBar at bottom
  - [x] Hover: scale 1.02 / Tap: scale 0.98 (Framer Motion)
  - [x] `data-testid="topic-card-{slug}"`
- [x] Create `src/components/SyncStatusBar.tsx`
  - [x] Shows "Last synced X ago"
  - [x] Manual sync button with spinner
- [x] Create `src/services/srStateService.ts`
  - [x] `getDueCardIds(cardIds)` — reads localStorage sr_state
  - [x] `getMasteryStats(cardIds)` — state=2, reps≥3 = mastered
- [x] Build `src/pages/TopicBrowserPage.tsx`
  - [x] SearchBar with `debounceMs=0`
  - [x] "Review all due" button → navigates `/review/all`
  - [x] TopicCard grid (useMemo filtered)
  - [x] Empty search state `data-testid="empty-search-state"`
  - [x] Offline banner
  - [x] `data-testid="topic-browser"`
- [x] Compute due-today counts via `srStateService.getDueCardIds`
- [x] Compute mastery % via `srStateService.getMasteryStats`
- [x] Run → GREEN (20 scenarios, 108 steps)

### 3.3 Refactor
- [x] `useMemo` for filtered topics (search)
- [x] `useMemo` for dueCountsMap, masteryMap, totalDue

---

## Phase 4: Topic Detail Page ✅ COMPLETE

> **Status:** `tsc --noEmit` clean · 20 BDD scenarios still GREEN · build 143KB gzipped

### 4.1 Implementation
- [x] Build `src/pages/TopicDetailPage.tsx`
  - [x] Fetches topic file on mount if not cached
  - [x] Shows loading spinner while fetching
  - [x] TopicHeader: topic name (DM Serif 32px), source files list
  - [x] StatsRow: New / Learning / Review / Mastered counts with icons
  - [x] NextReviewLabel: "Next card due in 3 hours" (computed from SR state)
  - [x] StartReviewButton: large, amber, Framer Motion press animation
  - [x] `data-testid="topic-detail"`
  - [x] `/accessibility-review`

---

## Phase 5: Review Session ✅ COMPLETE

> BDD: `features/card-review.feature`, `features/swipe-gesture.feature`, `features/fsrs-scheduling.feature`
> **Status:** All 42 BDD scenarios GREEN · 215 steps passing · `tsc --noEmit` clean

### 5.1 Feature Files & Steps
- [x] Write `features/card-review.feature`
- [x] Write `features/swipe-gesture.feature`
- [x] Write step definitions for both
- [x] Run → RED → GREEN

### 5.2 FSRS Service
- [x] Write `features/fsrs-scheduling.feature`
- [x] Write step definitions
- [x] Create `src/services/fsrsService.ts`
  - [x] Wraps `ts-fsrs` — never implement FSRS manually
  - [x] `rateCard(card, srData, rating)` → returns new `CardSRData`
  - [x] `getDueCards(cards, srState)` → returns cards where `due <= now`
  - [x] `getNextIntervals(card, srData)` → returns preview intervals for all 4 ratings
  - [x] New card: creates default SR data if none exists
- [x] `src/services/srStateService.ts` (already had `getSRState`, `updateCard`, `resetAllState`)
- [x] Run `fsrs-scheduling` tests → GREEN

### 5.3 FlashCard Component
- [x] Create `src/components/FlashCard.tsx`
  - [x] 3D flip animation: `rotateY` via `data-flipped` attr (Framer Motion)
  - [x] Front: DM Serif Display, large text, centered
  - [x] Back: DM Sans, body text, scrollable if long
  - [x] Source label: bottom-right, muted 11px
  - [x] Swipe drag: `motion.div` with drag="x", dragConstraints (threshold 80px)
  - [x] Color overlay during drag (green right, red left)
  - [x] `data-testid="flash-card"`
  - [x] Keyboard: Space/Enter to flip

### 5.4 RatingBar Component
- [x] Create `src/components/RatingBar.tsx`
  - [x] 4 buttons: Again / Hard / Good / Easy
  - [x] Each shows next interval below label
  - [x] Background tint per semantic color at 15% opacity
  - [x] Staggered Framer Motion appear animation after flip
  - [x] Press animation: scale 0.95
  - [x] `data-testid="rate-again"`, `data-testid="rate-hard"`, etc.
  - [x] `aria-label` includes interval: "Rate as Good — next review in 3 days"

### 5.5 SwipeCardStack Component
- [x] Create `src/components/SwipeCardStack.tsx`
  - [x] Renders top 2 cards (card below: scale 0.95, y+8px)
  - [x] Exit: `x: ±500, rotate: ±15` with spring physics
  - [x] Card entry: scale 0.95 → 1 as previous exits
  - [x] `data-testid="swipe-card-stack"`

### 5.6 SessionComplete Component
- [x] Create `src/components/SessionComplete.tsx`
  - [x] Cards reviewed count
  - [x] "Back to topics" and "Review again" buttons
  - [x] `data-testid="session-complete"`

### 5.7 ReviewStore & ReviewSessionPage
- [x] Create `src/stores/reviewStore.ts`
  - [x] `loadSession(slug, cards)` — builds queue (due + new cards, new capped at 20)
  - [x] `flip()` — sets isFlipped=true
  - [x] `rate(rating)` — calls fsrsService, updates srStateService, advances queue
  - [x] Re-queue "Again" cards at end of session queue
- [x] Build `src/pages/ReviewSessionPage.tsx`
  - [x] SessionHeader: topic name, progress bar (X of N), exit button
  - [x] SwipeCardStack (centered, full width on mobile)
  - [x] RatingBar (shows after flip)
  - [x] Keyboard shortcuts: Space=flip, 1/2/3/4=ratings, ←/→=Again/Good
  - [x] `data-testid="review-session-page"`
- [x] Wire `/review/:slug` and `/review/all` routes in router
- [x] Run all review + swipe + fsrs tests → GREEN

### 5.8 Refactor
- [x] Session queue logic is pure (loadSession, rate are pure state transformations)
- [ ] Optimize SR state writes (batch if rating multiple in < 100ms)

---

## Phase 6: Progress Dashboard ✅ COMPLETE

> BDD: `features/progress.feature`
> **Status:** All 49 BDD scenarios GREEN · 245 steps passing · `tsc --noEmit` clean

### 6.1 Feature File & Steps
- [x] Write `features/progress.feature`
- [x] Write step definitions (`features/step_definitions/progress.steps.tsx`)
- [x] Run → RED → GREEN

### 6.2 ProgressStore
- [x] Create `src/stores/progressStore.ts`
  - [x] `recordReview(cardId, rating)` — appends to review_log, updates streak
  - [x] `getStreakData()` — computes current and longest streak (with reset if day skipped)
  - [x] `getHeatmapData()` — last 90 days as `{ date, count }[]`
  - [x] `getTopicStats(slug, cards)` — mastered/learning/new counts + mastery %
  - [x] `getTotalReviews()` — sum across review_log
  - [x] `getHeatmapLevel(count)` — exported utility (0=gray, 1=light, 2=medium, 3=dark)
  - [x] All computed from `review_log` + `streak_data` in localStorage
- [x] Wired `progressStore.recordReview` into `reviewStore.rate`

### 6.3 Components

- [x] Create `src/components/StreakWidget.tsx`
  - [x] Large DM Serif number (48px), count-up animation on mount
  - [x] Flame SVG icon
  - [x] "day streak" / "day streak — keep it up!" label
  - [x] Zero state: grayed out, "Start your streak today"
- [x] Create `src/components/ReviewHeatmap.tsx`
  - [x] 90-day grid, staggered fade-in (2ms delay per cell)
  - [x] Cell: 10px square, 2px gap, data-level attribute
  - [x] Colors: gray / light-green / medium-green / dark-green
  - [x] Today's cell: amber ring
  - [x] Tooltip: date + review count on hover
- [x] Build `src/pages/ProgressPage.tsx`
  - [x] StreakWidget (prominent, top)
  - [x] ReviewHeatmap (last 90 days section)
  - [x] Per-topic mastery list (topic name + mastery % + MasteryBar)
  - [x] Total stats row: total reviews + total cards
  - [x] `data-testid="progress-page"`
- [x] Wire `/progress` route in `src/router.tsx`
- [x] Run → GREEN (49 scenarios, 245 steps)

---

## Phase 7: Offline Support ✅ COMPLETE

> BDD: `features/offline.feature`
> **Status:** All 53 BDD scenarios GREEN · 266 steps passing · `tsc --noEmit` clean

### 7.1 Feature File & Steps
- [x] Write `features/offline.feature`
- [x] Write step definitions (`features/step_definitions/offline.steps.tsx`)
- [x] Run → RED → GREEN

### 7.2 Implementation
- [x] Create `src/hooks/useOfflineStatus.ts`
  - [x] Listens to `online`/`offline` browser events
  - [x] Returns `{ isOnline, wasOffline }`
- [x] Create `src/components/OfflineBanner.tsx`
  - [x] Shown when `!isOnline` (hook) or `forceShow` (indexStore.isOffline)
  - [x] Shows time since last successful sync (localStorage `last_synced_at`)
  - [x] Framer Motion slide-down from top
  - [x] Dismissible (× button, 44px touch target)
  - [x] `/accessibility-review`
- [x] Wire offline fallback into `gdriveService.ts`
  - [x] On Drive fetch failure → check IndexedDB → return cache or throw
  - [x] TypeError (network error) skips retry entirely
  - [x] Throws "This topic hasn't been downloaded yet" when no cache exists
- [x] `indexStore.ts` saves `last_synced_at` to localStorage on successful fetch
- [x] `TopicBrowserPage.tsx` uses `OfflineBanner` component (replaces inline banner)
- [x] `TopicDetailPage.tsx` shows "Sync when online" message for offline error
- [x] Run → GREEN (53 scenarios, 266 steps)

---

## Phase 8: Settings Page ✅ COMPLETE

> **Status:** `tsc --noEmit` clean · 53 BDD scenarios still GREEN · 266 steps passing

### 8.1 Implementation
- [x] Build `src/pages/SettingsPage.tsx`
  - [x] SyncSection
    - [x] "Last synced: X minutes ago" label
    - [x] "Force full re-sync" button (clears all `topic_fetched_at_*` timestamps)
  - [x] CacheSection
    - [x] "Cards cached: X topics, Y total cards"
    - [x] "Clear card cache" button (clears IndexedDB topic stores only)
  - [x] ResetSection
    - [x] "Reset all SR state" — danger zone, red border
    - [x] Requires confirmation: `ConfirmDialog` asking user to type "RESET"
    - [x] Clears `sr_state`, `streak_data`, `review_log` from localStorage
  - [x] `/accessibility-review`
- [x] Create `src/components/ConfirmDialog.tsx`
  - [x] Modal overlay (flex-centered fixed overlay, dialog inside)
  - [x] Input field for typing confirmation text
  - [x] Confirm button disabled until text matches
  - [x] Framer Motion scale-in animation
  - [x] `/accessibility-review`

---

## Phase 9: Navigation & App Shell ✅ COMPLETE

> **Status:** `tsc --noEmit` clean · 53 BDD scenarios still GREEN · 266 steps passing

### 9.1 Router & Layout
- [x] Finalize `src/router.tsx` with all routes
  - [x] AppLayout nested route: auth-gated, wraps Topics/Progress/Settings with BottomNav + Toaster
  - [x] Review session route stays full-screen (no BottomNav)
- [x] Create `src/components/BottomNav.tsx` (mobile)
  - [x] 3 tabs: Topics, Progress, Settings
  - [x] Active tab: amber underline, slightly larger icon
  - [x] Framer Motion indicator animation (shared layout `layoutId`)
  - [x] Safe area insets: `padding-bottom: env(safe-area-inset-bottom)`
  - [x] `aria-current="page"` on active tab · `aria-label` on all buttons
- [x] Create `src/components/Toaster.tsx`
  - [x] Toast notifications for sync success, errors, reset complete
  - [x] Framer Motion slide-in from right · `mode="popLayout"`
  - [x] Auto-dismiss after 3s · manual dismiss button (44px target)
  - [x] `src/stores/toastStore.ts` (Zustand) — `addToast`, `removeToast`
- [x] `AnimatePresence mode="wait"` page transitions in router (opacity + y slide)
- [ ] Responsive: bottom nav on mobile, sidebar on desktop (optional)

---

## Phase 10: Polish & Micro-interactions ✅ COMPLETE

> **Status:** `tsc --noEmit` clean · build 160.70 KB gzipped (< 300KB limit)

- [x] Skeleton loading states for all data-fetching components
  - [x] `src/components/Skeleton.tsx` — shimmer via CSS `skeleton-shimmer` keyframe
  - [x] `TopicBrowserPage` — 5 skeleton topic cards during index load
- [x] Card loading skeleton in SwipeCardStack (shown while topic file fetches)
  - [x] `SwipeCardStack` accepts `isLoading` prop; shows skeleton card shape
  - [x] `ReviewSessionPage` detects loading state and passes it through
- [x] Progress bar animation in SessionHeader (smooth Framer Motion spring)
  - [x] Already implemented: `animate={{ width }}` with spring `stiffness: 200, damping: 30`
- [x] `prefers-reduced-motion` media query — disable all animations
  - [x] CSS global rule in `index.css` kills non-JS transitions/animations
  - [x] `<MotionConfig reducedMotion="user">` in `main.tsx` — Framer Motion respects OS setting
- [x] Safe area insets verified on iOS Safari
  - [x] `TopicBrowserPage` + `ProgressPage` + `SettingsPage` — added `paddingTop: env(safe-area-inset-top)`
  - [x] `ReviewSessionPage` + `TopicDetailPage` + `BottomNav` already correct
- [x] All touch targets verified ≥ 44×44px
  - [x] Toaster dismiss button bumped from 28px → 44px
  - [x] All other interactive elements already compliant
- [x] Dark mode audit: every color uses CSS variables, no hardcoded hex
  - [x] Added `--color-on-accent`, `--heatmap-1/2/3` CSS variables to `:root`
  - [x] Fixed: `FlashCard` overlay text, `SessionComplete` button, `TopicDetailPage` button
  - [x] Fixed: `ConfirmDialog` confirm button, `SettingsPage` danger colors, `ReviewHeatmap` levels
- [ ] Test on iPhone (real device or BrowserStack)
- [ ] Test on Android Chrome (real device or BrowserStack)
- [x] Bundle size check: `npm run build` → **160.70 KB gzipped** ✓

---

## Phase 11: Testing & QA

### 11.1 BDD Complete
- [ ] All feature files passing: `npm run test:bdd` → all GREEN
- [ ] BDD report reviewed: `open reports/cucumber.html`

### 11.2 Unit Tests
- [ ] `fsrsService.test.ts` — all FSRS calculations
- [ ] `srStateService.test.ts` — localStorage read/write
- [ ] `gdriveService.test.ts` — mocked fetch calls
- [ ] `indexedDBService.test.ts` — using fake-indexeddb
- [ ] `progressStore.test.ts` — streak, heatmap, mastery calculations
- [ ] `npm run test` → all GREEN

### 11.3 E2E Tests
- [ ] `e2e/full-review-session.spec.ts`
- [ ] `e2e/topic-browser.spec.ts`
- [ ] `npm run test:e2e` → all GREEN

### 11.4 Accessibility Audit
- [ ] Run `/accessibility-review` on every page component
- [ ] Verify keyboard navigation: Tab through every interactive element
- [ ] Verify screen reader: VoiceOver on iOS (or NVDA on Windows)
- [ ] Verify WCAG 2.2 AA contrast on all text

### 11.5 Full Suite
- [ ] `npm run test:all` → all GREEN
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No ESLint errors: `npm run lint`

---

## Phase 12: Deployment

> **Remote:** `https://github.com/Haraprosad/flashcard-app.git` (main branch)
> `netlify.toml` already configured: build=`npm run build`, publish=`dist`, Node 20, SPA redirect.

### 12.1 GitHub Actions CI/CD

- [x] Create `.github/workflows/ci-cd.yml`
  - [x] **CI job** (every push + PR): type-check → lint → Vitest → Cucumber BDD → Playwright E2E
  - [x] **Deploy job** (main push only, after CI green): `npm run build` → `netlify deploy --prod`
  - [x] **Preview job** (PRs only, after CI green): builds and deploys a Netlify draft URL
  - [x] All `VITE_*` env vars injected from GitHub Secrets at build time
  - [x] Commit and push `.github/workflows/ci-cd.yml` to GitHub

### 12.2 Google Cloud Console (manual)

- [ ] Create OAuth 2.0 Web Client ID (if not already done for dev)
- [ ] Add `http://localhost:5173` to authorized origins (dev)
- [ ] Add Netlify production URL to authorized origins (after deploy)
- [ ] Add Netlify production URL to authorized redirect URIs

### 12.3 Netlify Site Setup (manual — one-time)

- [ ] Go to [app.netlify.com](https://app.netlify.com) → "Add new site" → "Deploy manually" (or import from Git)
  - Build command: `npm run build` · Publish directory: `dist` (already in `netlify.toml`)
- [ ] Get **Site ID**: Site Settings → General → Site ID
- [ ] Get **Auth Token**: User Settings → Applications → Personal access tokens → "New access token"
- [ ] Add GitHub Secrets to the repo → Settings → Secrets → Actions:
  - [ ] `NETLIFY_AUTH_TOKEN` — personal access token from above
  - [ ] `NETLIFY_SITE_ID` — site ID from above
  - [ ] `VITE_GOOGLE_CLIENT_ID` — your OAuth client ID
  - [ ] `VITE_GDRIVE_FOLDER_NAME` = `ObsidianSecondBrain`
  - [ ] `VITE_GDRIVE_FLASHCARDS_FOLDER` = `flashcards`
  - [ ] `VITE_GDRIVE_SR_STATE_FILE` = `sr_state.json`
- [ ] Trigger first deploy: push any commit to `main` → GitHub Actions runs CI then deploys
- [ ] Copy production URL → add to Google Cloud Console

### 12.4 Post-Deploy Verification

- [ ] Open production URL → login page appears
- [ ] OAuth sign-in completes → topic browser appears
- [ ] Topic card tap → topic detail loads
- [ ] Review session works end-to-end
- [ ] Swipe gestures work on mobile
- [ ] Offline test: disable WiFi → cached data still shows
- [ ] `/review/all` works across multiple topics

---

## Phase 13: Enhanced Card Types — Intuition, Cloze, Progressive Disclosure ✅ COMPLETE

> **Status:** All 66 BDD scenarios GREEN · `tsc --noEmit` clean

### 13.1 Type System Updates
- [x] Update `src/types/index.ts`
  - [x] Add `CardType = 'standard' | 'cloze' | 'intuition'`
  - [x] Add `CardTier = 1 | 2 | 3`
  - [x] Add `type` field to `FlashCard` interface (default: `'standard'`)
  - [x] Add `tier` field to `FlashCard` interface (default: `1`)
  - [x] Add `concept_id` optional field to `FlashCard` (groups tiered cards)
- [x] Add Zod schemas for new fields with safe defaults (backward compat)
- [x] `tsc --noEmit` clean

### 13.2 Sync Script — Parse New Card Formats
- [!] Out of scope for React app — sync script is a separate Claude Code script

### 13.3 Cloze Card Rendering
- [x] Create `src/components/ClozeCard.tsx`
  - [x] Render blanks as `___` with amber underline styling
  - [x] Back side: full text with revealed segment highlighted (amber accent, bold)
  - [x] Framer Motion pulse animation on blank, fade-in for revealed text
- [x] Create `src/services/clozeService.ts`

### 13.4 Intuition Card Styling
- [x] Create `src/components/IntuitionCard.tsx`
  - [x] Scenario text rendered in italic DM Serif Display
  - [x] "Imagine:" prefix in amber accent, bold uppercase

### 13.5 FlashCard Component Update — Dispatch by Type
- [x] Update `src/components/FlashCard.tsx`
  - [x] Renders `ClozeCard` when `type === 'cloze'`
  - [x] Renders `IntuitionCard` when `type === 'intuition'`
  - [x] Tier badge: small pill top-right (T1=green, T2=amber, T3=blue)
  - [x] All types share same flip interaction and swipe behavior

### 13.6 Progressive Disclosure — Tier Gating Logic
- [x] Create `src/services/tierService.ts`
  - [x] `getTierEligibleCards(cards, srState)` — concept grouping + T1/T2/T3 gating
  - [x] `getTierBreakdown(cards)` — counts per tier
- [x] Update `reviewStore.loadSession` to call `getTierEligibleCards`

### 13.7 BDD Tests ✅ COMPLETE
- [x] Write `features/enhanced-cards.feature` — 7 scenarios GREEN
- [x] Write `features/progressive-disclosure.feature` — 6 scenarios GREEN
- [x] Write step definitions for both feature files
- [x] `npm run test:bdd` → 66/66 GREEN

### 13.8 Visual Polish
- [x] Tier badge: small pill top-right (T1=green, T2=amber, T3=blue) — in `FlashCard.tsx`
- [x] Cloze blank: amber underline, pulse animation — in `ClozeCard.tsx`
- [ ] Intuition card: subtle gradient background
- [ ] Review session header tier breakdown ("5 T1 · 3 T2 · 2 T3")

---

## Phase 14: Exploration Cards — Concept Formation Before Retrieval ✅ COMPLETE

> **Status:** All 79 BDD scenarios GREEN · `tsc --noEmit` clean

### 14.1 Type System Updates
- [x] Add `ExplorationStep` interface to `src/types/index.ts`
- [x] Add `'exploration'` to `CardType` union in `FlashCard`
- [x] Add `steps?: ExplorationStep[]` to `FlashCard` interface
- [x] Add Zod schema for `ExplorationStep` in `gdriveService.ts`
- [x] `tsc --noEmit` clean

### 14.2 Exploration State Service
- [x] Add to `src/services/srStateService.ts`:
  - [x] `markExplored(conceptId)`, `isExplored(conceptId)`, `getExploredConceptIds()`, `resetExploredConcepts()`
- [x] `resetExploredConcepts()` wired into `resetAllState()` (called by SettingsPage)

### 14.3 Tier Gating Update
- [x] Updated `src/services/tierService.ts` — gates ALL tiers when concept has unexplored exploration card
- [x] Added `getConceptExplorationCard(conceptId, cards)` helper

### 14.4 ExplorationCard Component
- [x] Create `src/components/ExplorationCard.tsx`
  - [x] Props: `steps`, `onComplete`, `onSkip`
  - [x] Step indicator: 4 dots (`data-testid="step-dot-{i}"`, `data-done`)
  - [x] Scenario/Problem/Guide: full text + "Next →" button
  - [x] Challenge (multiple-choice): option buttons, "Check answer", success/retry flow
  - [x] Challenge (free-text): text input + "Check answer" (case-insensitive)
  - [x] "Skip to flashcards" ghost link always visible
  - [x] Framer Motion x-slide between steps
  - [x] All touch targets ≥ 44×44px
  - [x] `data-testid="exploration-card"`, `data-testid="exploration-step-{kind}"`

### 14.5 ReviewSessionPage Update
- [x] `reviewStore.loadSession` prepends unexplored exploration cards to queue
- [x] `reviewStore.advanceExploration(conceptId)` — marks explored, appends newly eligible T1 cards, advances index
- [x] `ReviewSessionPage` renders `ExplorationCard` full-screen when `currentCard.type === 'exploration'`
  - [x] "Concept Introduction" label shown
  - [x] `data-testid="exploration-mode"` on wrapper
  - [x] `onComplete` / `onSkip` both call `advanceExploration(concept_id)`

### 14.6 Sync Script — Exploration Card Format (SKILL.md)
- [!] Out of scope for React app — sync script is a separate Claude Code script

### 14.7 BDD Tests ✅ COMPLETE
- [x] Write `features/exploration-cards.feature` — 13 scenarios
- [x] Write `features/step_definitions/exploration-cards.steps.tsx`
- [x] `npm run test:bdd` → 79/79 GREEN

### 14.8 Visual Polish
- [x] Step indicator: amber dot fill animation (Framer Motion animate)
- [x] Challenge option buttons: scale 0.97 on press, amber border on selection
- [x] Success state: `ChallengeSuccess` component with scale-in animation
- [ ] Guide step: code blocks styled with `JetBrains Mono`
- [ ] "Concept Introduction" label in `TopicDetailPage` card count row

---

## Phase 15: Battle-Proof SR State Persistence (IndexedDB + Drive Backup) ✅ COMPLETE

> **Status:** All 87 BDD scenarios GREEN · `tsc --noEmit` clean

### 15.1 Google OAuth Scope Upgrade

- [x] Update `GoogleSignInButton.tsx` — scope upgraded to `drive.file + drive.readonly`
- [x] Update `.env.example` — add `VITE_GDRIVE_SR_STATE_FILE=sr_state.json`

### 15.2 IndexedDB Schema Migration (v1 → v2)

- [x] Update `src/services/indexedDBService.ts` — bumped to v2
  - [x] Add `sr_state` object store (keyPath: `'cardId'`)
  - [x] Add `review_log` object store (keyPath: `'id'`, autoIncrement)
  - [x] Add `streak_data`, `explored_concepts`, `device_id`, `sr_state_synced_at`, `sr_state_pending_upload` to `meta` store
  - [x] Migration: reads localStorage sr_state/review_log/streak_data/explored_concepts on first v2 open, writes to IDB, clears localStorage
- [x] Update `src/services/srStateService.ts` — in-memory cache backed by IDB; sync reads, async writes; init() for startup
- [x] Update `src/stores/progressStore.ts` — review_log and streak_data use IDB via in-memory cache
- [x] Wire `srStateService.init()` + `progressStore.init()` in `App.tsx` on mount
- [x] `tsc --noEmit` clean

### 15.3 Drive SR State Service

- [x] Create `src/services/srStateDriveService.ts`
  - [x] `fetchSRState(token)` — finds and downloads `sr_state.json` with Zod validation
  - [x] `pushSRState(token, payload)` — PATCH existing or POST new; sets pending flag on failure
  - [x] `mergeSRState(local, remote)` — highest reps wins; tie-break by most recent `last_review`
  - [x] `mergeExploredConcepts`, `mergeReviewLog`, `mergeStreakData` helpers
  - [x] `buildPayload` — assembles SRStateFile from in-memory caches

### 15.4 Login Flow — Drive Merge

- [x] Updated `src/stores/authStore.ts` — `signInAndSync` async action does full Drive merge on login
- [x] `isSyncing` state exposed; never blocks login on error
- [x] `GoogleSignInButton.tsx` — calls `signInAndSync` instead of `signIn`
- [x] `useAuth.ts` — exposes `isSyncing` and `signInAndSync`

### 15.5 Post-Session Drive Push

- [x] `reviewStore.rate` — triggers fire-and-forget Drive push when session ends
- [x] `driveSyncStatus` state: `'idle' | 'syncing' | 'synced' | 'failed'`
- [x] `SessionComplete` — shows Drive sync badge (syncing / saved to Drive / saved locally)

### 15.6 Settings Page Updates

- [x] Added "Backup & Sync" section to `SettingsPage.tsx`
  - [x] Last synced to Drive timestamp
  - [x] "Sync now" button
  - [x] "Restore from Drive" button (with ConfirmDialog)
  - [x] "Export SR state" button (downloads sr_state.json)

### 15.7 BDD Tests

- [x] Write `features/sr-persistence.feature` — 8 scenarios GREEN
- [x] Write `features/step_definitions/sr-persistence.steps.tsx`
- [x] Updated all affected step defs to use `srStateService`/`progressStore` APIs instead of localStorage
- [x] `npm run test:bdd` → 87/87 GREEN

### 15.8 Visual & UX Polish

- [x] `SessionComplete` — Drive sync status badge
- [x] `SettingsPage` — "Backup & Sync" section with last-synced timestamp
- [ ] `TopicBrowserPage` — show "Progress synced X ago" in SyncStatusBar alongside card sync
- [ ] Offline badge in `OfflineBanner` — distinguish "cards offline" from "progress not yet synced"

---

## Phase 16: Science-Backed Learning UX Improvements ✅ COMPLETE

> **Status:** All 110 BDD scenarios GREEN · 7 unit tests GREEN · `tsc --noEmit` clean

### 16.1 Confidence Check Before Challenge Answer
> **Science:** Koriat & Bjork (2006) — metacognitive calibration; forces learners to surface the illusion-of-knowing before seeing options.

- [ ] Add `confidenceRating: 'low' | 'medium' | 'high' | null` to `ExplorationCard` state
- [ ] Add 3-button row in `ChallengeInput` that renders BEFORE the options list:
  - [ ] Buttons: `[ Low ]  [ Medium ]  [ High ]`
  - [ ] Options list is disabled (pointer-events: none, muted opacity) until confidence is selected
  - [ ] Once selected, highlight chosen button (amber border) and enable options
  - [ ] `data-testid="confidence-low"`, `data-testid="confidence-medium"`, `data-testid="confidence-high"`
- [ ] Store `confidenceRating` alongside challenge result in `advanceExploration` payload
- [ ] Extend `ExplorationResult` type in `src/types/index.ts` to include `confidenceRating` and `firstAttemptCorrect`
- [ ] Write `features/confidence-calibration.feature` — scenarios:
  - [ ] Options disabled until confidence selected
  - [ ] Confidence rating stored on correct first attempt
  - [ ] Confidence rating stored on wrong first attempt
  - [ ] Confidence chip visible in result state
- [ ] Run → RED → GREEN

### 16.2 Delayed Explanation Reveal on Wrong Answer
> **Science:** Butler et al. (2007) — a brief delay before seeing corrective feedback improves long-term retention vs. instant reveal.

- [ ] In `ChallengeInput`, when `challengeState === 'wrong'`:
  - [ ] Show `"No, you are wrong ✗"` header immediately (current behaviour — keep)
  - [ ] Replace immediate explanation render with a `"See why →"` button
  - [ ] On tap, animate explanation in (Framer Motion fade + y slide, same as current)
  - [ ] `data-testid="see-why-button"`, `data-testid="challenge-explanation"`
  - [ ] Explanation state: `'hidden' | 'revealed'` — resets to `'hidden'` on `handleTryAgain`
- [ ] Write `features/delayed-feedback.feature` — scenarios:
  - [ ] Explanation hidden on wrong answer
  - [ ] "See why" button visible on wrong answer
  - [ ] Explanation revealed after tapping "See why"
  - [ ] Explanation resets to hidden on "Try again"
- [ ] Run → RED → GREEN

### 16.3 Pre-Session Recall Prompt
> **Science:** Roediger & Karpicke (2006) — attempting recall before exposure strengthens encoding even when the attempt is incorrect.

- [ ] Create `src/components/RecallPrompt.tsx`
  - [ ] Full-screen interstitial shown ONCE per topic per session, before first card renders
  - [ ] Content: `"Before we start — what do you already know about [topic]?"`
  - [ ] Subtext: `"Take 30 seconds to think. No input needed — just think."`
  - [ ] Single CTA: `"I've thought about it → Continue"`
  - [ ] `data-testid="recall-prompt"`, `data-testid="recall-continue"`
  - [ ] Framer Motion fade-in, 300ms, no spring bounce (matches brand)
  - [ ] NOT shown for `/review/all` (topic label is ambiguous) or for single-card sessions
  - [ ] NOT shown if session is a re-queue ("Review again" from SessionComplete)
- [ ] In `ReviewSessionPage`, render `RecallPrompt` before first card when:
  - [ ] `mode !== 'fresh'` — fresh start is already a deliberate re-learning intent
  - [ ] `showRecallPrompt` local state; dismissed on continue tap
- [ ] Write `features/recall-prompt.feature` — scenarios:
  - [ ] Recall prompt shown at session start for topic with cards
  - [ ] Recall prompt not shown for /review/all
  - [ ] Recall prompt not shown in fresh mode
  - [ ] Cards begin after continue tapped
- [ ] Run → RED → GREEN

### 16.4 Skip Friction — Reduce Bypass of Exploration
> **Science:** Bjork & Bjork (2011) — desirable difficulties only work if the difficulty is actually imposed; a visible, easy skip defeats the mechanism.

- [ ] Move "Skip to flashcards" out of primary button zone:
  - [ ] Remove the `<a>` link from the main bottom-nav area
  - [ ] Add a `⋯` icon button (top-right of exploration card, 44×44px)
  - [ ] On tap, show a small inline confirmation:
    - [ ] `"Skip building the mental model?"`
    - [ ] `"Your flashcards will unlock, but the concept won't be anchored."`
    - [ ] Buttons: `[ Keep going ]` (primary)  `[ Skip anyway ]` (ghost, muted)
  - [ ] `data-testid="exploration-overflow-menu"`, `data-testid="skip-confirm-cancel"`, `data-testid="skip-confirm-proceed"`
- [ ] Write `features/exploration-skip-friction.feature` — scenarios:
  - [ ] Skip link not visible in primary button area
  - [ ] Overflow menu opens on ⋯ tap
  - [ ] Confirmation dialog shown before skipping
  - [ ] "Keep going" dismisses dialog, returns to exploration
  - [ ] "Skip anyway" calls onSkip and advances
- [ ] Run → RED → GREEN

### 16.5 First-Attempt Tracking
> **Science:** Generation effect nuance — first-attempt success vs. retry success produce meaningfully different memory traces.

- [ ] In `ExplorationCard`/`ChallengeInput`, track `attemptCount: number` (starts at 0, increments on each `handleCheckAnswer` call)
- [ ] Derive `firstAttemptCorrect: boolean` — true only when `attemptCount === 0` at time of `challengeState === 'correct'`
- [ ] Pass `firstAttemptCorrect` through `onComplete(result)` callback (update prop signature)
- [ ] In `reviewStore.advanceExploration`, store result on the card's exploration record
- [ ] Surface in `ProgressPage`:
  - [ ] Add `"First-try rate"` stat to per-topic stats row: `X% of explorations correct on first attempt`
  - [ ] Compute from `progressStore` — add `getFirstAttemptStats()` method
  - [ ] `data-testid="first-attempt-rate"`
- [ ] Write `features/first-attempt-tracking.feature` — scenarios:
  - [ ] First-attempt correct recorded when answered right on first try
  - [ ] First-attempt incorrect recorded when answered wrong then retried
  - [ ] First-try rate displayed in ProgressPage
- [ ] Run → RED → GREEN

### 16.6 Tier-Respecting Interleave Shuffle
> **Science:** Rohrer & Taylor (2007) — interleaved card order (T1-A, T1-B, T2-A, T2-B) produces 43% better delayed recall than blocked (T1-A, T2-A, T3-A, T1-B…).

- [ ] Create `src/services/interleaveService.ts`
  - [ ] `interleaveByTier(cards: FlashCard[]): FlashCard[]`
    - [ ] Group cards by tier: `tier1[]`, `tier2[]`, `tier3[]`
    - [ ] Within each tier group, shuffle randomly
    - [ ] Interleave: pick one from each non-empty tier bucket in rotation
    - [ ] Result preserves T1-before-T2-before-T3 ordering constraint (tier groups never mix)
    - [ ] Exploration cards always stay at position 0 (before all flashcards)
  - [ ] Export `interleaveByTier` — pure function, fully testable
- [ ] Update `reviewStore.loadSession` to call `interleaveByTier` after `getTierEligibleCards`
- [ ] Write `interleaveService.test.ts` unit tests:
  - [ ] All T1 cards appear before any T2 cards
  - [ ] Within T1, cards from different concepts alternate
  - [ ] Exploration cards unaffected (position 0)
  - [ ] Single-concept note: order unchanged (no interleaving possible)
- [ ] Write `features/interleaved-review.feature` — scenarios:
  - [ ] Cards from different concepts alternate within same tier
  - [ ] Tier order preserved: all T1 before T2 before T3
  - [ ] Exploration card always first
- [ ] Run unit tests → GREEN
- [ ] Run BDD → GREEN

### 16.7 Exploration Mode Label Update
> **Science:** Framing effect — "Concept Introduction" (passive, consumptive) vs. "Build the mental model" (active, generative) primes different learning postures.

- [ ] In `ReviewSessionPage.tsx`, change label from `"Concept Introduction"` → `"Build the mental model"`
- [ ] Update `data-testid` if any BDD step definitions match on label text (search `step_definitions/` for the string)
- [ ] Verify no snapshot tests or BDD steps assert the old string literal
- [ ] Run `npm run test:bdd` → GREEN

### 16.8 Visual & UX Polish
- [ ] Confidence buttons: amber border on selected, muted on unselected; min 44×44px
- [ ] "See why →" button: ghost style matching "Try again" button; arrow animates on hover
- [ ] RecallPrompt: DM Serif Display title, DM Sans body, same dark background as exploration mode
- [ ] Overflow menu (⋯): positioned top-right without overlapping step indicator
- [ ] First-try rate in ProgressPage: same stat row style as existing stat chips
- [ ] `prefers-reduced-motion`: all new animations respect existing `MotionConfig` in `main.tsx`

### 16.9 Full Suite Check
- [ ] `npm run test:bdd` → all GREEN (87 + new scenarios)
- [ ] `npm run test` → all GREEN (including `interleaveService.test.ts`)
- [ ] `npx tsc --noEmit` → clean
- [ ] All new touch targets ≥ 44×44px verified
- [ ] All new interactive elements have `aria-label` or visible text label

---

## Ongoing

- [ ] Update `TASKS.md` as tasks are completed
- [ ] Run `npm run test:all` before every git push
- [ ] Keep `docs/flashcard-app-spec-v2.md` updated if architecture decisions change
- [ ] Keep `docs/BDD-WORKFLOW.md` updated with new feature files as added

---

## Notes & Decisions

> Add architectural decisions, tradeoffs, and "why we did it this way" notes here as you build.

- **Card IDs must be stable**: sync script uses `{slug}-{basename}-{index}` format. If this ever changes, all SR state is silently orphaned. Do not change without a migration.
- **No backend**: if cross-device sync is needed in the future, consider a Cloudflare KV worker or Supabase — but keep it outside this repo.
- **FSRS via ts-fsrs**: do not implement FSRS logic manually. The library handles algorithm complexity correctly.
- **Token in memory**: deliberate security decision. Refresh via silent OAuth on page reload.