# TASKS.md — Flashcard App
> Track progress here. Check boxes as you complete tasks. Never mark a task done until `npm run test:all` passes.
> Last updated: 2026-05-15

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

## Phase 2: Google Drive Integration

> BDD: `features/index-fetch.feature` and `features/topic-lazy-load.feature`

### 2.1 Feature Files
- [ ] Write `features/index-fetch.feature`
- [ ] Write `features/topic-lazy-load.feature`
- [ ] Run → RED

### 2.2 Step Definitions
- [ ] Write `features/step_definitions/index-fetch.steps.ts`
- [ ] Write `features/step_definitions/topic-lazy-load.steps.ts`
- [ ] Run → RED (pending)

### 2.3 Implementation
- [ ] Create `src/services/gdriveService.ts`
  - [ ] `findFolder(name, parentId?, token)` — searches Drive for folder by name
  - [ ] `findFile(name, parentId, token)` — searches Drive for file by name
  - [ ] `downloadFile(fileId, token)` — downloads file content
  - [ ] `fetchIndex(token)` — finds and downloads `index.json`
  - [ ] `fetchTopicFile(slug, token)` — finds and downloads `{slug}.json`
  - [ ] All functions typed with proper return types
  - [ ] Error handling: network error, 401, file not found
- [ ] Create `src/services/indexedDBService.ts`
  - [ ] Open DB `flashcard-app-db` version 1
  - [ ] `saveIndex(index)`, `getIndex()`
  - [ ] `saveTopicFile(slug, data)`, `getTopicFile(slug)`
  - [ ] `getTopicFetchedAt(slug)`, `setTopicFetchedAt(slug)`
  - [ ] `getFolderIds()`, `saveFolderIds(ids)`
  - [ ] `clearTopicCache()` for settings
- [ ] Create `src/stores/indexStore.ts`
  - [ ] Fetch index on auth, store in Zustand + IndexedDB
  - [ ] Freshness check logic
- [ ] Create `src/stores/topicStore.ts`
  - [ ] `fetchTopic(slug, token)` with cache check
  - [ ] `getCardsByTopic(slug)`
  - [ ] `getAllCachedCards()`
- [ ] Run `npm run test:bdd` → GREEN
- [ ] Run `npm run test` → GREEN

### 2.4 Refactor
- [ ] Add Zod schema validation for `index.json` shape
- [ ] Add Zod schema validation for topic file shape
- [ ] Add retry with exponential backoff to Drive calls
- [ ] Cache folder IDs in IndexedDB to avoid repeated folder lookups

---

## Phase 3: Topic Browser UI

> BDD: `features/topic-browser.feature`

### 3.1 Feature File & Steps
- [ ] Write `features/topic-browser.feature`
- [ ] Write step definitions
- [ ] Run → RED

### 3.2 Implementation
- [ ] Create `src/components/SearchBar.tsx`
  - [ ] `DM Sans` font, dark theme input
  - [ ] Animated clear button (Framer Motion, appears when text > 0)
  - [ ] 300ms debounce
  - [ ] `/accessibility-review`
- [ ] Create `src/components/MasteryBar.tsx`
  - [ ] 3px thin bar, animated fill (Framer Motion spring)
  - [ ] Color: green for mastered, amber for in-progress
- [ ] Create `src/components/TopicCard.tsx`
  - [ ] `/frontend-design /daticket` — apply design system
  - [ ] DM Serif topic name, muted card count
  - [ ] Due-today amber pill badge (hidden if 0)
  - [ ] MasteryBar at bottom
  - [ ] Hover: scale 1.02, border brighten (Framer Motion whileHover)
  - [ ] Press: scale 0.98 (whileTap)
  - [ ] `data-testid="topic-card-{slug}"`
  - [ ] `/accessibility-review`
- [ ] Create `src/components/SyncStatusBar.tsx`
  - [ ] Shows "Last synced X minutes ago"
  - [ ] Manual sync button (refresh icon + "Sync")
  - [ ] Spinner during sync
- [ ] Build `src/pages/TopicBrowserPage.tsx`
  - [ ] 2-col mobile / 3-col desktop responsive grid
  - [ ] SyncStatusBar at top
  - [ ] SearchBar
  - [ ] "Review all due" button (shows total due count)
  - [ ] TopicCard grid with staggered Framer Motion entry animation
  - [ ] Empty search state
  - [ ] Loading skeleton (3 placeholder cards while index fetches)
  - [ ] `data-testid="topic-browser"`
  - [ ] `/accessibility-review`
- [ ] Compute due-today counts from SR state + card IDs per topic
- [ ] Compute mastery % per topic
- [ ] Run → GREEN

### 3.3 Refactor
- [ ] `useMemo` for filtered topics (search)
- [ ] `useMemo` for due counts (expensive calculation)
- [ ] Skeleton loading component reused across pages

---

## Phase 4: Topic Detail Page

### 4.1 Implementation
- [ ] Build `src/pages/TopicDetailPage.tsx`
  - [ ] Fetches topic file on mount if not cached
  - [ ] Shows loading spinner while fetching
  - [ ] TopicHeader: topic name (DM Serif 32px), source files list
  - [ ] StatsRow: New / Learning / Review / Mastered counts with icons
  - [ ] NextReviewLabel: "Next card due in 3 hours" (computed from SR state)
  - [ ] StartReviewButton: large, amber, Framer Motion press animation
  - [ ] `data-testid="topic-detail"`
  - [ ] `/accessibility-review`

---

## Phase 5: Review Session

> BDD: `features/card-review.feature` and `features/swipe-gesture.feature`

### 5.1 Feature Files & Steps
- [ ] Write `features/card-review.feature`
- [ ] Write `features/swipe-gesture.feature`
- [ ] Write step definitions for both
- [ ] Run → RED

### 5.2 FSRS Service (implement first, needed by review)
> BDD: `features/fsrs-scheduling.feature`
- [ ] Write `features/fsrs-scheduling.feature`
- [ ] Write step definitions
- [ ] Create `src/services/fsrsService.ts`
  - [ ] Wraps `ts-fsrs` — never implement FSRS manually
  - [ ] `rateCard(card, srData, rating)` → returns new `CardSRData`
  - [ ] `getDueCards(cards, srState)` → returns cards where `due <= now`
  - [ ] `getNextIntervals(card, srData)` → returns preview intervals for all 4 ratings
  - [ ] New card: creates default SR data if none exists
- [ ] Create `src/services/srStateService.ts`
  - [ ] `getSRState()` → reads full `SRState` from localStorage
  - [ ] `updateCard(cardId, srData)` → synchronous write to localStorage
  - [ ] `resetAllState()` → clears sr_state, streak_data, review_log
- [ ] Run `fsrs-scheduling` tests → GREEN

### 5.3 FlashCard Component
- [ ] Create `src/components/FlashCard.tsx`
  - [ ] `/frontend-design /daticket` — apply design system
  - [ ] 3D flip animation: `rotateY` 0° → 180° (Framer Motion)
  - [ ] Front: DM Serif Display, large text, centered
  - [ ] Back: DM Sans, body text, can scroll if long
  - [ ] Source label: bottom-right, muted 11px
  - [ ] Swipe drag: `motion.div` with drag="x", dragConstraints
  - [ ] Color overlay during drag (green right, red left)
  - [ ] `data-testid="flash-card"`
  - [ ] Keyboard: Space/Enter to flip
  - [ ] `/accessibility-review`

### 5.4 RatingBar Component
- [ ] Create `src/components/RatingBar.tsx`
  - [ ] 4 buttons: Again / Hard / Good / Easy
  - [ ] Each shows next interval below label
  - [ ] Background tint per semantic color at 15% opacity
  - [ ] Staggered Framer Motion appear animation after flip
  - [ ] Press animation: scale 0.95, color flash
  - [ ] `data-testid="rate-again"`, `data-testid="rate-hard"`, etc.
  - [ ] `aria-label` includes interval: "Rate as Good — next review in 3 days"
  - [ ] `/accessibility-review`

### 5.5 SwipeCardStack Component
- [ ] Create `src/components/SwipeCardStack.tsx`
  - [ ] Renders top 2 cards (card below: scale 0.95, y+8px)
  - [ ] Velocity-aware swipe exit animation
  - [ ] Snap-back for short drags (< 80px)
  - [ ] Exit: `x: ±500, rotate: ±15` with spring physics
  - [ ] Card entry: scale 0.95 → 1 as previous exits
  - [ ] `data-testid="swipe-card-stack"`

### 5.6 SessionComplete Component
- [ ] Create `src/components/SessionComplete.tsx`
  - [ ] Cards reviewed count (animated count-up)
  - [ ] Time taken
  - [ ] Next due date for topic
  - [ ] "Back to topics" and "Review again" buttons
  - [ ] Confetti/particle celebration (CSS only)
  - [ ] `data-testid="session-complete"`

### 5.7 ReviewStore & ReviewSessionPage
- [ ] Create `src/stores/reviewStore.ts`
  - [ ] `loadSession(cards)` — builds queue (due + new cards, new capped at 20)
  - [ ] `flip()` — toggles isFlipped
  - [ ] `rate(rating)` — calls fsrsService, updates srStateService, advances queue
  - [ ] `getDueCards(cards)` — filters by due date
  - [ ] Re-queue "Again" cards at end of session queue
- [ ] Build `src/pages/ReviewSessionPage.tsx`
  - [ ] SessionHeader: topic name, progress bar (X of N), exit button
  - [ ] SwipeCardStack (centered, full width on mobile)
  - [ ] RatingBar (shows after flip)
  - [ ] Keyboard shortcuts: Space=flip, 1/2/3/4=ratings, ←/→=Again/Good
  - [ ] `data-testid="review-session-page"`
  - [ ] `/accessibility-review`
- [ ] Run all review + swipe + fsrs tests → GREEN

### 5.8 Refactor
- [ ] Extract session queue logic into pure functions (easier to test)
- [ ] Optimize SR state writes (batch if rating multiple in < 100ms)

---

## Phase 6: Progress Dashboard

> BDD: `features/progress.feature`

### 6.1 Feature File & Steps
- [ ] Write `features/progress.feature`
- [ ] Write step definitions
- [ ] Run → RED

### 6.2 ProgressStore
- [ ] Create `src/stores/progressStore.ts`
  - [ ] `recordReview(cardId, rating)` — appends to review_log, updates streak
  - [ ] `getStreakData()` — computes current and longest streak
  - [ ] `getHeatmapData()` — last 90 days as `{ date, count }[]`
  - [ ] `getTopicStats(slug, cards)` — mastered/learning/new counts + mastery %
  - [ ] All computed from `review_log` in localStorage

### 6.3 Components
- [ ] Create `src/components/StreakWidget.tsx`
  - [ ] Large DM Serif number (48px), count-up animation on mount
  - [ ] Flame SVG icon
  - [ ] "day streak" / "day streak — keep it up!" label
  - [ ] Zero state: grayed out, "Start your streak today"
  - [ ] `/accessibility-review`
- [ ] Create `src/components/ReviewHeatmap.tsx`
  - [ ] 90-day grid, 7 rows (days of week) × 13 columns (weeks)
  - [ ] Cell: 10px square, 2px gap
  - [ ] Colors: gray / light-green / medium-green / dark-green
  - [ ] Today's cell: amber ring
  - [ ] Staggered fade-in (2ms delay per cell)
  - [ ] Tooltip: date + review count on hover
  - [ ] `/accessibility-review`
- [ ] Build `src/pages/ProgressPage.tsx`
  - [ ] StreakWidget (prominent, top)
  - [ ] ReviewHeatmap
  - [ ] Per-topic mastery list (each row: topic name + mastery % + mini bar)
  - [ ] Total stats row: total reviews, avg daily, total cards
  - [ ] Animate stat numbers on mount (count-up)
  - [ ] `/accessibility-review`
- [ ] Run → GREEN

---

## Phase 7: Offline Support

> BDD: `features/offline.feature`

### 7.1 Feature File & Steps
- [ ] Write `features/offline.feature`
- [ ] Write step definitions
- [ ] Run → RED

### 7.2 Implementation
- [ ] Create `src/hooks/useOfflineStatus.ts`
  - [ ] Listens to `online`/`offline` browser events
  - [ ] Returns `{ isOnline, wasOffline }`
- [ ] Create `src/components/OfflineBanner.tsx`
  - [ ] Shown when `!isOnline`
  - [ ] Shows time since last successful sync
  - [ ] Framer Motion slide-down from top
  - [ ] Dismissible
  - [ ] `/accessibility-review`
- [ ] Wire offline fallback into `gdriveService.ts`
  - [ ] On Drive fetch failure → check IndexedDB → return cache or throw
- [ ] Run → GREEN

---

## Phase 8: Settings Page

### 8.1 Implementation
- [ ] Build `src/pages/SettingsPage.tsx`
  - [ ] SyncSection
    - [ ] "Last synced: X minutes ago" label
    - [ ] "Force full re-sync" button (clears all `topic_fetched_at_*` timestamps)
  - [ ] CacheSection
    - [ ] "Cards cached: X topics, Y total cards"
    - [ ] "Clear card cache" button (clears IndexedDB topic stores only)
  - [ ] ResetSection
    - [ ] "Reset all SR state" — danger zone, red border
    - [ ] Requires confirmation: `ConfirmDialog` asking user to type "RESET"
    - [ ] Clears `sr_state`, `streak_data`, `review_log` from localStorage
  - [ ] `/accessibility-review`
- [ ] Create `src/components/ConfirmDialog.tsx`
  - [ ] Modal overlay (not `position: fixed` — use layout trick)
  - [ ] Input field for typing confirmation text
  - [ ] Confirm button disabled until text matches
  - [ ] Framer Motion scale-in animation
  - [ ] `/accessibility-review`

---

## Phase 9: Navigation & App Shell

### 9.1 Router & Layout
- [ ] Finalize `src/router.tsx` with all routes
- [ ] Create `src/components/BottomNav.tsx` (mobile)
  - [ ] 3 tabs: Topics, Progress, Settings
  - [ ] Active tab: amber underline, slightly larger icon
  - [ ] Framer Motion indicator animation (shared layout)
  - [ ] Safe area insets: `padding-bottom: env(safe-area-inset-bottom)`
  - [ ] `/accessibility-review`
- [ ] Create `src/components/Toaster.tsx`
  - [ ] Toast notifications for sync success, errors, reset complete
  - [ ] Framer Motion slide-in from top-right
  - [ ] Auto-dismiss after 3s
- [ ] `AnimatePresence` page transitions in router (opacity + y slide)
- [ ] Responsive: bottom nav on mobile, sidebar on desktop (optional)

---

## Phase 10: Polish & Micro-interactions

- [ ] Skeleton loading states for all data-fetching components
- [ ] Card loading skeleton in SwipeCardStack (shown while topic file fetches)
- [ ] Progress bar animation in SessionHeader (smooth Framer Motion spring)
- [ ] `prefers-reduced-motion` media query — disable all animations
- [ ] Safe area insets verified on iOS Safari
- [ ] All touch targets verified ≥ 44×44px
- [ ] Dark mode audit: every color uses CSS variables, no hardcoded hex
- [ ] Test on iPhone (real device or BrowserStack)
- [ ] Test on Android Chrome (real device or BrowserStack)
- [ ] Bundle size check: `npm run build -- --report` → must be < 300KB gzipped

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