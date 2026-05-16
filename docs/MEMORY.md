# MEMORY.md — Project State

> Kept under 80 lines intentionally. Update at the end of every session.
> Ask Claude: "Update MEMORY.md based on what we just built."

---

## What

Spaced-repetition flashcard React app. Source: Obsidian vault → Google Drive
(`ObsidianSecondBrain/flashcards/`). One JSON file per topic. No backend. Netlify deploy.
Stack: React 19 + TS + Vite 5 + Tailwind v3 + Zustand + ts-fsrs + Framer Motion.

---

## Phase

**Current:** 9 — Navigation & App Shell

**Focus:** BottomNav, Toaster, AppLayout with AnimatePresence page transitions

**Updated:** 2026-05-16

**Last session:** Phase 9 complete. toastStore (Zustand, addToast/removeToast). Toaster component (Framer Motion slide-in from right, auto-dismiss 3s, popLayout AnimatePresence). BottomNav (3 tabs, amber indicator with layoutId shared layout, safe-area-inset-bottom, aria-current). Router refactored: AppLayout nested route wraps /topics, /topics/:slug, /progress, /settings with BottomNav + Toaster + AnimatePresence mode="wait" exit transitions. Review session stays full-screen. tsc clean, 53 BDD scenarios GREEN (266 steps).

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

## In Progress

- [ ] Nothing yet

## Next 3

1. Phase 10: Skeleton loading states for data-fetching components
2. Phase 10: `prefers-reduced-motion` media query — disable all animations
3. Phase 11: Unit tests — fsrsService, srStateService, progressStore

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

---

## Blockers

Design skills (impeccable, daticket, etc.) require manual install with API keys — skip until Phase 3 UI work begins.

---

## Load on demand (do not load unless needed)

- `docs/PROJECT.md` — full spec, data contracts, component tree, all features
- `docs/TASKS.md` — full checkbox list by phase
- `docs/BDD-WORKFLOW.md` — Gherkin feature files + step definitions
