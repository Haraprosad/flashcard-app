# MEMORY.md — Project State
> Kept under 60 lines intentionally. Update at the end of every session.
> Ask Claude: "Update MEMORY.md based on what we just built."

---

## What

Spaced-repetition flashcard React app. Source: Obsidian vault → Google Drive
(`ObsidianSecondBrain/flashcards/`). One JSON file per topic. No backend. Netlify deploy.
Stack: React 19 + TS + Vite 5 + Tailwind v3 + Zustand + ts-fsrs + Framer Motion.

---

## Phase

**Current:** 2 — Google Drive Integration

**Focus:** Write `features/index-fetch.feature` + `features/topic-lazy-load.feature` → RED → implement gdriveService + indexedDBService → GREEN

**Updated:** 2026-05-15

**Last session:** Phase 1 complete. Auth BDD 5 scenarios/26 steps GREEN. Unit tests GREEN. TypeScript compiles clean.

---

## Done

- [x] All planning docs written (PROJECT.md, TASKS.md, BDD-WORKFLOW.md, CLAUDE.md, MEMORY.md)
- [x] Phase 0: Vite app created, all deps installed, folder structure, types, configs, env, git init
- [x] Phase 1: Auth feature file, step defs, authStore, useAuth, GoogleSignInButton, LoginPage, router with protected routes, authService, AuthErrorBoundary. BDD 5/5 GREEN.

## In Progress

- [ ] Nothing yet

## Next 3

1. Write `features/index-fetch.feature` and `features/topic-lazy-load.feature`
2. Run `npm run test:bdd` → confirm RED (undefined steps)
3. Implement `src/services/gdriveService.ts` + `src/services/indexedDBService.ts`

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

---

## Blockers
Design skills (impeccable, daticket, etc.) require manual install with API keys — skip until Phase 3 UI work begins.

---

## Load on demand (do not load unless needed)

- `docs/PROJECT.md` — full spec, data contracts, component tree, all features
- `docs/TASKS.md` — full checkbox list by phase
- `docs/BDD-WORKFLOW.md` — Gherkin feature files + step definitions
