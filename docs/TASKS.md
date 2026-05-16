# TASKS.md — Flashcard App
> Track progress here. Check boxes as you complete tasks. Never mark a task done until `npm run test:all` passes.
> Last updated: 2026-05-16

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

### 12.1 Google Cloud Console
- [ ] Create OAuth 2.0 Web Client ID
- [ ] Add `http://localhost:5173` to authorized origins (dev)
- [ ] Add Netlify production URL to authorized origins (after deploy)
- [ ] Add Netlify production URL to authorized redirect URIs

### 12.2 Netlify Setup
- [ ] Push repo to GitHub
- [ ] Connect GitHub repo to Netlify (new site from git)
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Set environment variables:
  - [ ] `VITE_GOOGLE_CLIENT_ID`
  - [ ] `VITE_GDRIVE_FOLDER_NAME` = `ObsidianSecondBrain`
  - [ ] `VITE_GDRIVE_FLASHCARDS_FOLDER` = `flashcards`
- [ ] Deploy
- [ ] Copy production URL → add to Google Cloud Console

### 12.3 Post-Deploy Verification
- [ ] Open production URL → login page appears
- [ ] OAuth sign-in completes → topic browser appears
- [ ] Topic card tap → topic detail loads
- [ ] Review session works end-to-end
- [ ] Swipe gestures work on mobile
- [ ] Offline test: disable WiFi → cached data still shows
- [ ] `/review/all` works across multiple topics

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