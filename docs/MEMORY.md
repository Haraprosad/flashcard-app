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

**Current:** 3 — Topic Browser UI

**Focus:** Write `features/topic-browser.feature` → RED → implement SearchBar, MasteryBar, TopicCard, SyncStatusBar, TopicBrowserPage → GREEN

**Updated:** 2026-05-15

**Last session:** Phase 2 complete. 13 BDD scenarios / 70 steps GREEN. `tsc --noEmit` clean. All Phase 2.4 refactors done.

---

## Done

- [x] All planning docs written (PROJECT.md, TASKS.md, BDD-WORKFLOW.md, CLAUDE.md, MEMORY.md)
- [x] Phase 0: Vite app created, all deps installed, folder structure, types, configs, env, git init
- [x] Phase 1: Auth feature file, step defs, authStore, useAuth, GoogleSignInButton, LoginPage, router with protected routes, authService, AuthErrorBoundary. BDD 5/5 GREEN.
- [x] Phase 2: Google Drive Integration — index-fetch + topic-lazy-load BDD GREEN (13 scenarios, 70 steps). gdriveService (Zod + retry + folder ID cache), indexedDBService, indexStore, topicStore (sessionFetchedAt fast-path, getCardsByTopic, getAllCachedCards).

## In Progress

- [ ] Nothing yet

## Next 3

1. Write `features/topic-browser.feature`
2. Write step definitions → confirm RED
3. Implement `SearchBar`, `MasteryBar`, `TopicCard`, `SyncStatusBar`, `TopicBrowserPage`

---

## Key Decisions (never delete, only add)

| Decision | Rule |
|---|---|
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
