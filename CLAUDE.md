# CLAUDE.md — Obsidian Flashcard App

## Session start — read this first, always

Read `MEMORY.md` now. It is ~50 lines. It tells you everything about where the project is.
If MEMORY.md answers the question → work from it. Stop there.
Do not load other files unless the task requires them.

## Load on demand only

| File | Load when |
|---|---|
| `PROJECT.md` | Building a new feature, unclear on spec, checking data contracts |
| `TASKS.md` | Asked "what's next", starting a new phase, checking what's done |
| `docs/BDD-WORKFLOW.md` | Writing feature files, step definitions, or E2E tests |

---

## What this project is

Spaced-repetition flashcard app. Obsidian vault in Google Drive (`ObsidianSecondBrain/flashcards/`).
Claude Code sync script writes one JSON per topic to Drive. React app reads lazily, runs FSRS
locally, stores SR state in localStorage. No backend. Deploys to Netlify.

---

## Active design skills
Invoke on every UI task.

```
/impeccable           reads .impeccable.md — enforces project design language
/frontend-design      aesthetic direction before writing any UI code
/ui-ux-pro-max        visual style system, sector-appropriate
/ui                   21st.dev Magic — use for all new components
/daticket             Framer Motion physics animations
/accessibility-review run on every generated component, no exceptions
```

---

## Design language

### Aesthetic: Refined Dark Minimal
Study app. Used at night, on mobile. Premium native feel.
Think Linear meets high-end reading app.
Not: glassmorphism, neon, heavy shadows, cluttered layouts, default Tailwind gray.

### Typography
- Display / headings: `DM Serif Display`
- Body / UI: `DM Sans`
- Code in cards: `JetBrains Mono`
- Never: Inter, Roboto, Arial, Space Grotesk

### Colors
```css
--bg-base:        #0E0E10;
--bg-surface:     #18181B;
--bg-elevated:    #222227;
--bg-border:      #2E2E35;
--accent:         #F59E0B;
--accent-muted:   #78400A;
--text-primary:   #F4F4F5;
--text-secondary: #A1A1AA;
--text-muted:     #52525B;
--color-again:    #EF4444;
--color-hard:     #F97316;
--color-good:     #22C55E;
--color-easy:     #3B82F6;
```

### Spacing & shape
- Radius: `12px` cards · `8px` buttons · `6px` badges · `20px` bottom sheets
- Borders: `0.5px solid var(--bg-border)` — no heavy drop shadows
- Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px only

### Animation (Framer Motion + daticket)
```typescript
const spring       = { type: "spring", stiffness: 400, damping: 30 }
const smoothSpring = { type: "spring", stiffness: 200, damping: 25 }
```
1. Card flip: 3D Y-axis, `duration: 0.4s`, ease `[0.23, 1, 0.32, 1]`
2. Swipe exit: velocity-aware · `x: ±500, rotate: ±15`
3. Card entry: scale `0.95 → 1` as previous exits
4. RatingBar: staggered `staggerChildren: 0.05s` after flip
5. Page transitions: `AnimatePresence mode="wait"` · opacity + `y: 10 → 0`
6. Stats: count-up on progress page mount
7. Heatmap: staggered fade-in · `delay: index * 2ms`
8. Rating buttons: scale `1 → 0.95` on press · color flash on release
9. Session complete: CSS-only confetti
10. Max duration: 500ms (except card flip + page transitions)
11. Always wrap: `@media (prefers-reduced-motion: no-preference)`

---

## Code rules

### Always
- TypeScript strict — no `any`, no `as unknown`
- Zustand for global state · React hooks for local state
- `idb` for IndexedDB — never raw `indexedDB` API
- `ts-fsrs` for scheduling — never implement FSRS manually
- `react-swipeable` for swipe detection
- Framer Motion `motion.*` for all animated elements
- Tailwind + CSS variables for colors — no hardcoded hex in className
- All Drive calls → `src/services/gdriveService.ts` only
- All SR state reads/writes → `src/services/srStateService.ts` only

### Never
- No backend — static app only
- No Anthropic API key in the browser
- No auth token in localStorage — Zustand memory only
- No writing to Google Drive from React
- No implementing FSRS from scratch
- No `any` type assertions
- No `console.log` in committed code
- No default exports from stores

### File naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Services: `camelCaseService.ts`
- Stores: `camelCaseStore.ts`
- Feature files: `kebab-case.feature`

---

## BDD rule

Write `.feature` first → RED → step defs → RED → implement → GREEN → refactor.
Never write implementation before a failing test.
Run `npm run test:all` before every commit.

---

## Accessibility (non-negotiable)

- All interactive elements keyboard accessible
- Min touch target: 44×44px
- `aria-label` on all icon-only buttons
- Focus ring always visible — never `outline: none` without a replacement
- WCAG 2.2 AA contrast minimum on all text
- Run `/accessibility-review` on every component before marking done

---

## Mobile-first

Primary use: phone, one thumb, often at night.
- No hover-only interactions
- Safe area insets: `env(safe-area-inset-*)`
- Test iOS Safari 16+ and Chrome Android before marking any UI task done

---

## Prompt templates (copy-paste when building)

### New component
```
/frontend-design /daticket
Build [component] for the flashcard app.
Refined Dark Minimal. DM Serif + DM Sans. Amber #F59E0B. Base #0E0E10.
Framer Motion per CLAUDE.md animation rules. Run /accessibility-review after.
```

### New page
```
/impeccable /frontend-design /ui-ux-pro-max /daticket
Build the [page] page. Read .impeccable.md first.
Dark theme, mobile-first. AnimatePresence page transition.
```

### Component from 21st.dev
```
/ui [describe component]
Adapt to: DM Serif + DM Sans, dark theme #0E0E10, amber accent #F59E0B.
Apply Framer Motion animations from daticket skill.
```


**End session:**
```
Update MEMORY.md: move done items, update In Progress, set Next 3, add any new decisions, note blockers, update Phase and date.

Also Update TASKS.md:change status of the tasks according the present status.
```