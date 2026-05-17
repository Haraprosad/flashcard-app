# MEMORY.md — Project State

> Kept under 80 lines intentionally. Update at the end of every session.
> Ask Claude: "Update MEMORY.md based on what we just built."

---

## What

Concept Snap — spaced-repetition React app. Source: Obsidian vault → Google Drive
(`ObsidianSecondBrain/flashcards/`). One JSON file per topic. No backend. Netlify deploy.
Stack: React 19 + TS + Vite 5 + Tailwind v3 + Zustand + ts-fsrs + Framer Motion.

---

## Phase

**Current:** Phase 16 ✅ COMPLETE — Science-Backed Learning UX Improvements

**Updated:** 2026-05-17

**Last session:** Completed Phase 16 in full. ExplorationCard: confidence gating (3-button row before options, options locked until confidence selected), delayed explanation reveal (hidden until "See why →" tapped), skip friction (⋯ overflow menu replaces "Skip to flashcards" link), first-attempt tracking (attemptCount + firstAttemptCorrect in ExplorationResult). RecallPrompt component: full-screen pre-session interstitial (not shown for /all or fresh mode). ReviewSessionPage: recall prompt wired in, "Build the mental model" label. interleaveService: fixed algorithm (T1→T2→T3 ordered, concepts interleaved within each tier). progressStore: recordExplorationResult + getFirstAttemptStats, ProgressPage shows first-try rate. Fixed exploration-cards.feature and step defs for Phase 16 changes. Created 6 new feature files (confidence-calibration, delayed-feedback, recall-prompt, exploration-skip-friction, first-attempt-tracking, interleaved-review) with step definitions. Fixed card-review/offline timeouts caused by recall prompt. 7 interleaveService unit tests. All 110/110 BDD GREEN, tsc clean.

---

## Done

- [x] All planning docs written (PROJECT.md, TASKS.md, BDD-WORKFLOW.md, CLAUDE.md, MEMORY.md)
- [x] Phase 0: Vite app created, all deps installed, folder structure, types, configs, env, git init
- [x] Phase 1: Auth feature file, step defs, authStore, useAuth, GoogleSignInButton, LoginPage, router with protected routes, authService, AuthErrorBoundary. BDD 5/5 GREEN.
- [x] Phase 2: Google Drive Integration — index-fetch + topic-lazy-load BDD GREEN (13 scenarios, 70 steps). gdriveService (Zod + retry + folder ID cache), indexedDBService, indexStore, topicStore (sessionFetchedAt fast-path, getCardsByTopic, getAllCachedCards).
- [x] Phase 3: Topic Browser UI — topic-browser.feature BDD GREEN (7 scenarios, 20 total, 108 steps). SearchBar, MasteryBar, TopicCard, SyncStatusBar, srStateService, TopicBrowserPage.
- [x] Phase 4: TopicDetailPage — DM Serif 32px title, source file chips, 4-stat row, NextReviewLabel, amber StartReviewButton. 20 BDD scenarios GREEN.
- [x] Phase 5: Review Session — fsrsService, reviewStore, FlashCard, RatingBar, SwipeCardStack, SessionComplete, ReviewSessionPage. 42 BDD scenarios GREEN (215 steps).
- [x] Phase 6: Progress Dashboard — progressStore (recordReview, getStreakData with skip-reset, getHeatmapData, getTopicStats, getTotalReviews, getHeatmapLevel). StreakWidget (count-up, flame SVG, zero state). ReviewHeatmap (90-day grid, data attrs, amber today ring). ProgressPage (/progress route). recordReview wired into reviewStore.rate. 49 BDD scenarios GREEN (245 steps).
- [x] Phase 7: Offline Support — useOfflineStatus hook, OfflineBanner (slide-down, dismissible, last_synced_at), gdriveService IDB fallback + TypeError skip-retry + "This topic hasn't been downloaded yet" error, indexStore saves last_synced_at, TopicBrowserPage uses OfflineBanner, TopicDetailPage offline errors. 53 BDD scenarios GREEN (266 steps).
- [x] Phase 8: Settings Page — SettingsPage (SyncSection, CacheSection, ResetSection/danger zone), ConfirmDialog (type-to-confirm, scale-in animation), /settings route. tsc clean, 53 BDD scenarios GREEN.
- [x] Phase 9: Navigation & App Shell — toastStore, Toaster (slide-in from right, auto-dismiss 3s), BottomNav (3 tabs, amber layoutId indicator, safe-area-inset-bottom, aria-current), AppLayout nested route in router (wraps /topics /progress /settings with AnimatePresence mode="wait" + BottomNav + Toaster). Review session stays full-screen. tsc clean, 53 BDD scenarios GREEN (266 steps).
- [x] Phase 13: Enhanced Card Types — CardType ('standard'|'cloze'|'intuition'), CardTier (1|2|3), concept_id. ClozeCard (blanks+revealed highlight), IntuitionCard (italic DM Serif, amber "Imagine:" prefix), FlashCard dispatches by type with tier badge (T1=green, T2=amber, T3=blue). tierService (getTierEligibleCards gating T1→T2→T3). 66/66 BDD GREEN.
- [x] Phase 14: Exploration Cards — ExplorationStep type + 'exploration' CardType. srStateService exploration methods. tierService exploration gating. ExplorationCard 4-step stepper component (scenario/problem/guide/challenge, step dots, MC+free-text challenge). reviewStore prepends unexplored exploration cards, advanceExploration unlocks T1 cards. ReviewSessionPage renders full-screen exploration mode. 79/79 BDD GREEN.
- [x] Phase 15: Battle-Proof SR State Persistence — indexedDBService v2 (sr_state + review_log stores + localStorage migration). srStateService in-memory cache backed by IDB. progressStore same pattern. srStateDriveService (fetch/push/merge, offline pending flag). authStore signInAndSync with Drive merge on login. reviewStore post-session Drive push + driveSyncStatus. SessionComplete sync badge. SettingsPage Backup & Sync section. 87/87 BDD GREEN, tsc clean.
- [x] Phase 16: Science-Backed Learning UX — ExplorationCard confidence gating + delayed explanation + skip friction (⋯ menu) + first-attempt tracking. RecallPrompt interstitial. interleaveService (T1→T2→T3, concepts interleaved within tier). 6 new feature files. 7 unit tests. 110/110 BDD GREEN, tsc clean.

## In Progress

None.

## Next 3

1. Phase 11: Run full BDD suite + unit tests + E2E tests (BDD ✅ 110/110 — still need E2E + remaining unit tests)
2. Phase 12: Deploy to Netlify (Google Cloud Console OAuth setup + env vars)
3. Phase 13.8 / 14.8: Visual polish (intuition card gradient, guide step JetBrains Mono)

---

## Key Decisions (never delete, only add)

| Decision | Rule |
| --- | --- |
| File per topic | One `{slug}.json` in Drive — not one big file |
| FSRS | Use `ts-fsrs` npm package — never implement manually |
| Auth token | Zustand memory only — never localStorage |
| Card IDs | Format: `{slug}-{basename}-{index}` — must be stable across re-syncs |
| Drive access | React app is read-only — sync script owns all writes |
| Design | Dark-first · DM Serif + DM Sans · amber `#F59E0B` · base `#0E0E10` |
| Node compat | Node v20.12.2 — use vitest@1 + vite@5 + @vitejs/plugin-react@4 |
| Cucumber config | Named `cucumber.cjs` (not .js) — project uses `"type": "module"` in package.json |
| Test env | Use `happy-dom` (not jsdom) — jsdom 29 has ESM dependency conflicts on Node 20 |
| BDD loader | Use `tsx/esm` via `NODE_OPTIONS='--import tsx/esm'` + `import` directive in cucumber config |
| Step defs JSX | Use `.tsx` extension for step definitions containing JSX |
| Test isolation | Call `cleanup()` from `@testing-library/react` in `After` hook **before** resetting Zustand stores — prevents stale mounted components from firing async effects into the next scenario's state |
| sessionFetchedAt | `topicStore` tracks in-memory fetch timestamps; fast-path skips IDB+Drive when `sessionTs >= meta.generated_at` |
| Folder ID cache | `gdriveService` caches Drive folder IDs in IDB via `getFolderIds/saveFolderIds` — mock both in every BDD `Before` hook |
| Exploration cards | No FSRS scheduling — shown once per concept_id, gate stored in `explored_concepts` IDB metadata key via `srStateService`. Exploration completion unlocks T1 gating for that concept. |
| Exploration format | Sync script uses `===STEP: kind===` delimiters; challenge options use `- [ ]` / `- [x]` syntax. One exploration card per concept, grouped by `concept_id`. |
| SR state storage | Primary: IndexedDB `sr_state` store (not localStorage — too fragile). Backup: Drive `sr_state.json`. Merge on login: highest `reps` wins; tie-break by most recent `last_review`. |
| Drive scope | `drive.file` (not `drive.readonly`) — needed to write `sr_state.json`. Scope is narrow: only files the app created. |
| SRStateFile | Drive backup bundles sr_state + explored_concepts + review_log + streak_data in one JSON. Prevents partial restore. |
| Obsidian SR compat | SM-2 plugin (obsidian-spaced-repetition) — import-only, not ongoing sync. FSRS plugin (obsidian-recall) — full two-way bridge possible via sync script writing frontmatter. |

---

## Blockers

Design skills (impeccable, daticket, etc.) require manual install with API keys — skip until Phase 3 UI work begins.

---

## Load on demand (do not load unless needed)

- `docs/PROJECT.md` — full spec, data contracts, component tree, all features
- `docs/TASKS.md` — full checkbox list by phase
- `docs/BDD-WORKFLOW.md` — Gherkin feature files + step definitions
