# Flashcard App — Full Product Specification
> Hand this document to any LLM to get a complete understanding of the app before generating tasks, code, or deployment config.

---

## 1. What this app is

A personal spaced-repetition flashcard app that reads markdown notes from an Obsidian vault stored in Google Drive, converts them into flashcards using the Claude API, and presents them in a swipeable review UI. The app uses the FSRS (Free Spaced Repetition Scheduler) algorithm to schedule card reviews scientifically. All review state is stored locally in the browser. There is no custom backend — the only external dependencies are the Google Drive API and the Anthropic Claude API.

**Core user loop:**
1. User writes notes in Obsidian and tags them with `flashcard: true` in frontmatter.
2. User runs the Claude Code sync script (separately, on demand) which reads the vault from Google Drive and writes `flashcards.json` back to Drive.
3. User opens the React app, signs in with Google, and the app fetches `flashcards.json`.
4. User picks a topic, reviews due cards by swiping/rating, and the FSRS engine schedules the next review for each card.
5. Progress is shown on a dashboard.

---

## 2. Tech stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Typed, ecosystem support |
| Build tool | Vite | Fast dev server, small bundles |
| Styling | Tailwind CSS v3 | Utility-first, no runtime |
| State management | Zustand | Lightweight, no boilerplate |
| Local persistence | IndexedDB (via `idb`) | Cards cache + SR state |
| Google Auth | `@react-oauth/google` | Drive OAuth2 PKCE flow |
| Google Drive API | Fetch (REST) | Read `flashcards.json` from Drive |
| Spaced repetition | `ts-fsrs` (npm package) | FSRS v5 algorithm |
| Swipe gesture | `react-swipeable` | Touch + mouse drag |
| Animations | Framer Motion | Card flip, swipe exit |
| Testing | Vitest + Testing Library | Unit + component tests |
| BDD | Cucumber.js + Playwright | Feature files + E2E |
| Deployment | Netlify | Static hosting, env vars |

---

## 3. Environment variables

These go in `.env.local` for dev and in Netlify's environment settings for production.

```
VITE_GOOGLE_CLIENT_ID=         # Google OAuth client ID (Web Application type)
VITE_GDRIVE_FLASHCARDS_FILE=   # Google Drive file name: flashcards.json
VITE_GDRIVE_SR_STATE_FILE=     # Google Drive file name: sr_state.json
VITE_GDRIVE_FOLDER_NAME=       # ObsidianSecondBrain
```

No Anthropic API key in the React app. Claude API is only called by the separate Claude Code sync script.

**Google OAuth scope required:** `drive.file` (not `drive.readonly`). The `drive.file` scope is narrow — it only permits the app to read and write files it created. It does not grant access to the user's general Drive contents. This scope upgrade is required for the SR state backup feature.

---

## 4. Data contracts

### 4.1 flashcards.json (written by Claude Code, read by React app)

```typescript
interface FlashcardsFile {
  version: string;           // e.g. "2.0"
  generated_at: string;      // ISO timestamp
  cards: FlashCard[];
}

/**
 * Card types:
 * - 'standard'   = Q&A. front is a question, back is the answer.
 * - 'cloze'      = Fill-in-the-blank. front contains {{c1::text}} markers.
 *                  The app renders blanks in place of cloze markers.
 *                  Each cloze number (c1, c2, ...) is a separate card generated
 *                  by the sync script — so one source sentence may produce
 *                  multiple FlashCard objects, each blanking a different segment.
 * - 'intuition'  = Scenario-first. front paints a vivid picture/analogy,
 *                  back reveals the concept through the scenario.
 * - 'exploration' = Multi-step concept introduction. Shown ONCE per concept_id
 *                  before any FSRS cards for that concept are unlocked. Uses the
 *                  `steps` field instead of front/back. The 4-step flow is:
 *                    1. scenario  — vivid story, no jargon, creates the "why care?" hook
 *                    2. problem   — a concrete question posed inside that scenario
 *                    3. guide     — step-by-step walkthrough, long-form text OK
 *                    4. challenge — user solves a near-identical problem (MC or input)
 *                  Completing the challenge calls markExplored(concept_id), which
 *                  unlocks T1 FSRS cards for the same concept_id. No FSRS scheduling
 *                  is applied to exploration cards — they are gateways, not review items.
 *                  front/back are unused for this type; set to "" in the JSON.
 *
 * Tiers (progressive disclosure):
 * - 1 = Intuition — vivid scenario, analogy, "what does it feel like?" No jargon.
 * - 2 = Mechanism — how it works, causal chain, precise explanation.
 * - 3 = Formal — equations, specific numbers, edge cases, boundary conditions.
 *
 * The app enforces tier gating: Tier 2 cards only appear in review after
 * the Tier 1 card for the same concept has been rated "Good" or better at
 * least once. Tier 3 only after Tier 2. Exploration cards gate ALL tiers —
 * if a concept has an exploration card, it must be completed before T1 unlocks.
 * This prevents premature abstraction.
 */
interface ExplorationStep {
  kind: 'scenario' | 'problem' | 'guide' | 'challenge';
  title: string;                  // Short heading shown in the stepper nav
  body: string;                   // Rich markdown — long-form text is expected
  challenge_options?: string[];   // For 'challenge': multiple-choice answers
  challenge_answer?: number;      // Index into challenge_options (0-based)
  challenge_input?: boolean;      // True = free-text input instead of multiple choice
  challenge_explanation?: string; // Shown after wrong answer before allowing retry
}

interface FlashCard {
  id: string;                // Unique, stable. Format: "{filename}-{index}" e.g. "kubernetes-0"
  type: 'standard' | 'cloze' | 'intuition' | 'exploration';  // Card format. Defaults to 'standard'.
  tier: 1 | 2 | 3;          // Progressive disclosure level. Defaults to 1 if absent.
  front: string;             // Question / scenario / cloze template. Empty string for 'exploration'.
  back: string;              // Answer / explanation / revealed cloze text. Empty for 'exploration'.
  steps?: ExplorationStep[]; // Only for type='exploration'. The 4-step walkthrough content.
  topic: string;             // From Obsidian frontmatter: topic field
  tags: string[];            // From Obsidian frontmatter: tags array
  source_file: string;       // Original .md filename in vault
  created_at: string;        // ISO timestamp when card was generated
  concept_id?: string;       // Groups tiered cards for the same concept.
                             // e.g. "entropy" links exploration + T1+T2+T3 cards.
                             // Used for tier gating logic. Optional — if absent,
                             // no tier gating is applied to this card.
}
```

### 4.2 SR state — storage architecture

SR state is stored in two layers to be resilient to browser data loss:

**Layer 1 — Local (IndexedDB, `sr_state` store):**
Fast, synchronous-feeling reads/writes. Survives page refresh, tab close, and HTTP cache clears.
Does NOT survive "Clear all site data" or aggressive iOS Safari storage pressure.

**Layer 2 — Remote backup (Google Drive `sr_state.json`):**
Written after every completed review session. Read and merged with local state on every login.
Scope required: `drive.file` (narrow — only files the app created).
This is the source of truth after any local data loss event.

**Merge strategy (on login):** for each `cardId` present in either store, take the entry with
the higher `reps` count. If `reps` are equal, take the entry with the more recent `last_review`.
This ensures no review is ever rolled back.

```typescript
interface SRState {
  [cardId: string]: CardSRData;
}

interface CardSRData {
  due: string;               // ISO timestamp — next review due date
  stability: number;         // FSRS stability (days of memory half-life)
  difficulty: number;        // FSRS difficulty (1–10)
  elapsed_days: number;
  scheduled_days: number;
  reps: number;              // Total number of reviews
  lapses: number;            // Times rated "Again"
  state: 0 | 1 | 2 | 3;    // FSRS state: New=0, Learning=1, Review=2, Relearning=3
  last_review: string;       // ISO timestamp of last review
}

// sr_state.json written to Google Drive (same folder as flashcards.json)
interface SRStateFile {
  version: string;            // e.g. "1.0"
  updated_at: string;         // ISO timestamp of last write
  device_id: string;          // Random UUID generated on first app load, stored in IndexedDB
                              // Used for conflict detection (not blocking — merge still proceeds)
  sr_state: SRState;          // Full SR state object
  explored_concepts: string[]; // concept_id values where exploration was completed
  review_log: ReviewLogEntry[]; // Full review log (for streak + heatmap reconstruction)
  streak_data: StreakData;    // Current and longest streak
}
```

### 4.4 Rating enum

```typescript
type Rating = 'Again' | 'Hard' | 'Good' | 'Easy';
// Maps to FSRS Rating: Again=1, Hard=2, Good=3, Easy=4
```

---

## 5. Application routes

```
/                → Redirect to /topics if authenticated, else /login
/login           → Google OAuth sign-in screen
/topics          → Topic browser (list all topics + search)
/topics/:topic   → Topic detail (card count, mastery %, due today count, start review button)
/review/:topic   → Review session (swipe cards for selected topic)
/review/all      → Review session (all due cards across all topics)
/progress        → Progress dashboard (streak, heatmap, per-topic stats)
/settings        → Sync settings, clear cache, reset SR state
```

---

## 6. Component tree

```
App
├── AuthProvider          (Google OAuth context)
├── Router
│   ├── LoginPage
│   │   └── GoogleSignInButton
│   │
│   ├── TopicBrowserPage
│   │   ├── SearchBar
│   │   ├── SyncButton        (triggers manual re-fetch from Drive)
│   │   ├── TopicCard[]       (one per topic — shows due count, mastery %)
│   │   └── AllDueButton      (review all due cards regardless of topic)
│   │
│   ├── TopicDetailPage
│   │   ├── TopicHeader       (topic name, total cards, mastery %)
│   │   ├── StatsRow          (due today, new, learning, review counts)
│   │   └── StartReviewButton
│   │
│   ├── ReviewSessionPage
│   │   ├── SessionHeader     (progress bar, card X of N, topic name)
│   │   ├── ExplorationCard   (stepper: scenario → problem → guide → challenge)
│   │   │   └── StepIndicator (dot row: done / current / upcoming)
│   │   ├── SwipeCardStack    (top card is interactive, next card peeking behind)
│   │   │   └── FlashCard     (front/back flip, swipe gesture handler)
│   │   ├── RatingBar         (Again / Hard / Good / Easy buttons)
│   │   └── SessionComplete   (shown when all due cards reviewed)
│   │
│   ├── ProgressPage
│   │   ├── StreakWidget
│   │   ├── ReviewHeatmap     (GitHub-style calendar heatmap — last 90 days)
│   │   ├── TopicMasteryList  (per-topic: mastered / learning / new counts)
│   │   └── TotalStatsRow     (total cards, total reviews, average retention)
│   │
│   └── SettingsPage
│       ├── SyncStatus        (last synced timestamp, file size)
│       ├── ClearCacheButton
│       └── ResetSRStateButton
│
├── Toaster               (global toast notifications)
└── OfflineBanner         (shown when Drive fetch fails and cache is stale)
```

---

## 7. Feature specifications

### Feature 1: Google OAuth sign-in

- User clicks "Sign in with Google" on `/login`.
- App requests Google OAuth2 scopes: `openid email profile https://www.googleapis.com/auth/drive.readonly`.
- Access token is stored in memory (Zustand store), never in localStorage.
- On token expiry, silent re-auth is attempted. If it fails, user is redirected to `/login`.
- After sign-in, user is redirected to `/topics`.

### Feature 2: Fetch flashcards from Google Drive

- On first load (after auth), app searches Drive for a file named `flashcards.json` inside the folder `ObsidianSecondBrain`.
- Drive API call: `GET https://www.googleapis.com/drive/v3/files?q=name='flashcards.json' and '<folderId>' in parents`.
- File content is fetched, parsed, and stored in IndexedDB under key `cards_cache`.
- A `last_synced` timestamp is stored in localStorage.
- If the fetch fails (offline / error), the app falls back to IndexedDB cache and shows `OfflineBanner`.
- The `SyncButton` on the topic browser triggers a fresh fetch manually.

### Feature 3: Topic browser

- All unique `topic` values from the card list are extracted and shown as `TopicCard` tiles.
- Each tile shows: topic name, total card count, due-today count, mastery percentage.
- Mastery % = (cards with `reps >= 3 AND state === Review`) / total cards × 100.
- Due-today count = cards where `due <= now` for that topic.
- Search bar filters topics by name (case-insensitive substring match).
- "Review all due" button navigates to `/review/all` — reviews all due cards across every topic.

### Feature 4: Review session

- Session is seeded with due cards for the selected topic (or all topics for `/review/all`).
- Due cards = cards where SR state has `due <= Date.now()`, plus all cards with `state === New`.
- New cards are capped at 20 per session to avoid overwhelming.
- **Exploration gate:** Before any FSRS cards for a `concept_id` appear, the session checks whether an `exploration` card exists for that concept and whether `isExplored(concept_id)` is true in localStorage. If an unexplored exploration card exists, it is shown first in full-screen stepper mode. Only after the user completes (or skips) it does `markExplored(concept_id)` fire, unlocking the T1 FSRS cards for that concept within the same session.
- **Progressive disclosure (tier gating):** Cards with `tier: 2` only appear in review after the Tier 1 card with the same `concept_id` has been rated "Good" or "Easy" at least once. Tier 3 only after Tier 2 is rated "Good" or "Easy". Cards without a `concept_id` are always eligible (no gating).
- **Card type rendering:**
  - `standard` cards: render `front` as question text, `back` as answer text (existing behavior).
  - `intuition` cards: render `front` as scenario text (italic style), `back` as revealed explanation. Same flip interaction.
  - `cloze` cards: render `front` with `{{cN::text}}` replaced by `___` blanks. Back shows full text with the previously-blanked segment highlighted. Tapping a blank reveals it (optional interactive mode).
  - `exploration` cards: render as a 4-step stepper (no flip, no swipe, no rating bar). See Feature 10.
- Cards are shown as a stack. The top card is the active card.
- Card displays `front` by default. Tap/click the card to flip and reveal `back`.
- After flipping, the `RatingBar` appears with four buttons: Again / Hard / Good / Easy.
- On rating:
  1. `ts-fsrs` computes the new SR data for that card.
  2. Updated SR data is written to localStorage immediately (synchronous).
  3. Card animates off screen (swipe direction: right = Good/Easy, left = Again/Hard).
  4. Next card slides up.
- When all session cards are done, `SessionComplete` is shown with: cards reviewed count, time taken, next due date for this topic.

### Feature 5: Swipe gesture

- `react-swipeable` handles horizontal drag on the card.
- Swipe right (≥ 80px) = "Good" rating.
- Swipe left (≥ 80px) = "Again" rating.
- During drag, card rotates slightly (max ±15deg) and a colored overlay appears: green tint = right, red tint = left.
- Rating buttons below the card are always available as a fallback (keyboard accessible).
- On desktop, arrow keys also work: → = Good, ← = Again, 1/2/3/4 = Again/Hard/Good/Easy.

### Feature 6: FSRS scheduling

- Library: `ts-fsrs` (npm). Do not implement FSRS manually.
- `fsrs.repeat(card, now)` returns scheduling info for all 4 ratings.
- The scheduled intervals for each rating are shown below the rating button labels (e.g. "Good · 1d", "Easy · 4d").
- SR state per card is stored in `localStorage` under key `sr_state` as a JSON object keyed by card ID.
- SR state is never reset unless the user explicitly clicks "Reset SR state" in Settings.

### Feature 7: Progress dashboard

- Streak: count of consecutive days with at least 1 review. Stored in localStorage as `streak_data: { current, longest, last_review_date }`.
- Review heatmap: last 90 days. Each day shows a cell colored by review count (0=gray, 1-4=light green, 5-9=medium green, 10+=dark green). Data comes from a `review_log` array in localStorage: `[{ date: "YYYY-MM-DD", count: number }]`.
- Per-topic mastery: a list showing each topic with a mini progress bar — green = mastered, yellow = learning, gray = new.
- Total stats: total unique cards, total all-time reviews (from `review_log` sum), average daily reviews (last 30 days).

### Feature 8: Offline support

- All cards are cached in IndexedDB after the first successful fetch.
- SR state in localStorage is always available.
- Review sessions work fully offline — no network needed during a session.
- On reconnect, `SyncButton` appears with a "Sync now" prompt if `last_synced` is more than 24 hours ago.

### Feature 9: Settings

- "Re-sync from Drive" — clears IndexedDB card cache and re-fetches `flashcards.json`.
- "Clear card cache" — clears only IndexedDB. SR state is preserved.
- "Reset all SR state" — clears localStorage `sr_state` and `streak_data` and `review_log`. Confirmation dialog required.
- "Last synced" — shows the `last_synced` timestamp.

### Feature 10: Exploration Cards (concept formation before retrieval)

Exploration cards solve the cold-start problem: flashcards strengthen memories you already have, but cannot build the mental model from scratch. The exploration flow runs once per concept before any FSRS cards for that concept are shown.

**Flow:**

1. Session detects an `exploration` card whose `concept_id` is not yet in `explored_concepts` (localStorage).
2. `ExplorationCard` component replaces the normal card stack for that concept. No swipe, no flip, no rating bar.
3. The stepper has 4 steps — each is a full screen on mobile:
   - **Scenario** — a vivid, jargon-free story. Long text + optional image. Creates the "why care?" hook.
   - **Problem** — a concrete question posed inside the scenario. User reads and reflects; no interaction yet.
   - **Guide** — step-by-step walkthrough. Long markdown body. Code blocks, numbered lists, and diagrams are all valid here. The user taps "Next" to advance at their own pace.
   - **Challenge** — user answers a question. Either multiple-choice (tapping an option) or free-text input. Wrong answer: red flash, `challenge_explanation` shown, user retries. Correct answer: green flash + "Well done!" → "Start flashcards" button.
4. A "Skip to flashcards" link is always visible. Skipping also calls `markExplored(concept_id)` so the gate is lifted — it just forgoes the challenge feedback.
5. On completion or skip: `markExplored(concept_id)` is written to localStorage, T1 FSRS cards for that concept are added to the current session queue, and the normal card stack resumes.

**State:**

- `explored_concepts` key in localStorage: `string[]` of explored `concept_id` values.
- `srStateService.markExplored(id)` appends to this array.
- `srStateService.isExplored(id)` checks membership.
- Exploration cards have no entry in `sr_state` — they are never scheduled by FSRS.

**UI details:**

- Step indicator: a row of 4 dots at the top — filled amber = completed, amber ring = current, gray = upcoming.
- Body text uses `prose` styling — DM Sans, readable line-length (~65ch), generous line-height.
- Navigation: "Back" (ghost) + "Next" / "Check answer" / "Start flashcards" (amber primary) buttons pinned to bottom.
- Framer Motion `x` slide transitions between steps (`AnimatePresence mode="wait"`).
- `prefers-reduced-motion`: transitions disabled, steps appear instantly.
- Minimum touch targets: 44×44px on all interactive elements.

---

## 8. State management (Zustand stores)

```typescript
// authStore
{
  accessToken: string | null;
  userEmail: string;
  signIn: () => void;
  signOut: () => void;
}

// cardsStore
{
  cards: FlashCard[];
  topics: string[];
  lastSynced: Date | null;
  isLoading: boolean;
  fetchCards: (accessToken: string) => Promise<void>;
  getCardsByTopic: (topic: string) => FlashCard[];
}

// reviewStore
{
  srState: SRState;                              // loaded from IndexedDB on init; Drive-merged on login
  sessionCards: FlashCard[];
  currentIndex: number;
  isFlipped: boolean;
  sessionLog: { cardId: string; rating: Rating; timestamp: string }[];
  loadSession: (cards: FlashCard[]) => void;
  flipCard: () => void;
  rateCard: (rating: Rating) => void;
  getDueCards: (topic?: string) => FlashCard[];
}

// progressStore
{
  streak: StreakData;
  reviewLog: ReviewLogEntry[];
  getTopicStats: (topic: string) => TopicStats;
  recordReview: (cardId: string, rating: Rating) => void;
}
```

---

## 9. IndexedDB schema (via `idb`)

```typescript
// Database name: flashcard-app-db  |  Version: 2
// Object stores:
//   cards_cache   — keyPath: 'id'     — stores FlashCard[]
//
//   sr_state      — keyPath: 'cardId' — stores CardSRData records
//     { cardId: string, ...CardSRData }
//     Replaces the old localStorage 'sr_state' key entirely.
//     Written after every card rating. Read on session init.
//
//   review_log    — keyPath: 'id' (autoIncrement)
//     { id: number, date: 'YYYY-MM-DD', count: number, cardId: string, rating: Rating }
//     Replaces localStorage 'review_log'. Supports streak + heatmap queries.
//
//   metadata      — keyPath: 'key'    — stores { key: string, value: any }
//     keys used:
//       'flashcards_version'       → string
//       'flashcards_generated_at'  → string
//       'last_synced'              → ISO string
//       'sr_state_synced_at'       → ISO string  (last Drive sr_state.json write)
//       'device_id'                → string UUID (generated once, stable)
//       'explored_concepts'        → string[]    (concept_ids where exploration done)
//       'streak_data'              → StreakData   ({ current, longest, last_review_date })
```

---

## 10. Google Drive API calls

```typescript
// ── CARD CONTENT (read-only) ────────────────────────────────────────────────

// Step 1: Find the ObsidianSecondBrain folder
GET https://www.googleapis.com/drive/v3/files
  ?q=name='ObsidianSecondBrain' and mimeType='application/vnd.google-apps.folder'
  &fields=files(id,name)
// Authorization: Bearer {accessToken}

// Step 2: Find flashcards.json inside that folder
GET https://www.googleapis.com/drive/v3/files
  ?q=name='flashcards.json' and '{folderId}' in parents
  &fields=files(id,name,modifiedTime)

// Step 3: Download the file content
GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media
// Authorization: Bearer {accessToken}

// ── SR STATE BACKUP (read + write, requires drive.file scope) ───────────────

// Step 4: Find sr_state.json (same folder as flashcards.json)
GET https://www.googleapis.com/drive/v3/files
  ?q=name='sr_state.json' and '{folderId}' in parents
  &fields=files(id,name,modifiedTime)

// Step 5a: Download sr_state.json (on login — to merge with local IndexedDB)
GET https://www.googleapis.com/drive/v3/files/{srStateFileId}?alt=media
// Authorization: Bearer {accessToken}

// Step 5b: Create sr_state.json (first time — file does not exist yet)
POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
// Body: multipart — metadata part + JSON content part
// Metadata: { name: 'sr_state.json', parents: ['{folderId}'] }
// Authorization: Bearer {accessToken}

// Step 5c: Update sr_state.json (after every completed review session)
PATCH https://www.googleapis.com/upload/drive/v3/files/{srStateFileId}?uploadType=media
// Body: JSON string of SRStateFile
// Content-Type: application/json
// Authorization: Bearer {accessToken}
// Performed in background (non-blocking) after session ends.
// If offline: queued to IndexedDB metadata key 'sr_state_pending_upload' = true.
// On next successful Drive fetch: pending upload is flushed.
```

---

## 11. BDD feature files (Cucumber.js)

All `.feature` files live in `/features/`. Step definitions live in `/features/step_definitions/`.

Features to implement (one `.feature` file each):
- `vault-sync.feature` — parsing flashcards.json into card objects
- `card-review.feature` — rating a card, FSRS scheduling, session flow
- `topic-filter.feature` — filtering and searching topics
- `progress.feature` — streak calculation, heatmap data, mastery %
- `offline.feature` — IndexedDB fallback when Drive is unreachable
- `auth.feature` — sign-in flow, token storage, redirect behavior

---

## 12. Folder structure

```
flashcard-app/
├── public/
│   └── favicon.svg
├── features/
│   ├── vault-sync.feature
│   ├── card-review.feature
│   ├── topic-filter.feature
│   ├── progress.feature
│   ├── offline.feature
│   ├── auth.feature
│   └── step_definitions/
│       ├── vault-sync.steps.ts
│       ├── card-review.steps.ts
│       ├── topic-filter.steps.ts
│       ├── progress.steps.ts
│       └── auth.steps.ts
├── e2e/
│   ├── review-session.spec.ts
│   └── topic-browser.spec.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── components/
│   │   ├── FlashCard.tsx
│   │   ├── SwipeCardStack.tsx
│   │   ├── RatingBar.tsx
│   │   ├── TopicCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ReviewHeatmap.tsx
│   │   ├── StreakWidget.tsx
│   │   ├── SessionComplete.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── GoogleSignInButton.tsx
│   │   └── ConfirmDialog.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── TopicBrowserPage.tsx
│   │   ├── TopicDetailPage.tsx
│   │   ├── ReviewSessionPage.tsx
│   │   ├── ProgressPage.tsx
│   │   └── SettingsPage.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── cardsStore.ts
│   │   ├── reviewStore.ts
│   │   └── progressStore.ts
│   ├── services/
│   │   ├── gdriveService.ts      ← All Google Drive API calls
│   │   ├── fsrsService.ts        ← Wraps ts-fsrs
│   │   ├── indexedDBService.ts   ← idb wrapper
│   │   └── srStateService.ts     ← localStorage read/write for SR state
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCards.ts
│   │   ├── useReview.ts
│   │   ├── useProgress.ts
│   │   └── useOfflineStatus.ts
│   └── types/
│       └── index.ts              ← All shared TypeScript interfaces
├── .env.local                    ← VITE_GOOGLE_CLIENT_ID etc.
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── cucumber.js                   ← Cucumber config
├── netlify.toml
└── package.json
```

---

## 13. netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Environment variables to set in Netlify UI (Site settings → Environment variables):
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GDRIVE_FLASHCARDS_FILE` = `flashcards.json`
- `VITE_GDRIVE_FOLDER_NAME` = `ObsidianSecondBrain`

Also add your Netlify domain (e.g. `https://yourapp.netlify.app`) to the Google Cloud Console OAuth 2.0 authorized JavaScript origins and redirect URIs.

---

## 14. package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:bdd": "cucumber-js features/ --require-module ts-node/register --require 'features/step_definitions/**/*.ts'",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:bdd && npm run test:e2e",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

---

## 15. Key constraints and decisions

- No backend server. The app is 100% static and deploys to Netlify as-is.
- No Anthropic API key in the browser. Card generation happens only in the Claude Code sync script which runs locally on the developer's machine.
- **SR state is backed up to Google Drive (`sr_state.json`).** Cross-device sync is supported via Drive merge on login. This supersedes the earlier "no cross-device sync" constraint — Drive is the single source of truth after any local data loss.
- SR state is stored locally in IndexedDB (not localStorage). localStorage is too fragile for months of review history. IndexedDB survives normal browser cache clears; Drive backup covers full data-wipe scenarios.
- The Google OAuth token is stored in Zustand (memory only), never persisted to localStorage or cookies, for security.
- `flashcards.json` is treated as immutable by the React app (read only). `sr_state.json` is owned by the React app (read + write, `drive.file` scope).
- Card IDs must be stable across sync runs. The Claude Code script must use the same deterministic ID format (`{source_file_basename}-{index}`) so SR state keys survive re-syncs.
- The app must work on mobile browsers (iOS Safari, Android Chrome). Touch gestures are the primary review interaction.
- Tailwind purge is configured to scan all `.tsx` files so unused classes are removed in production.
- **Obsidian SR plugin compatibility:** The popular `obsidian-spaced-repetition` plugin (SM-2 algorithm) is not compatible for ongoing sync — SM-2 and FSRS parameters are non-interchangeable. The `obsidian-recall` plugin (FSRS-based) is compatible; the sync script can optionally write FSRS frontmatter fields back to notes to enable dual review (Obsidian + web app sharing one schedule).

---

## 16. Deployment checklist

- [ ] Google Cloud Console: create OAuth 2.0 Web Client, add Netlify domain to authorized origins
- [ ] `.env.local`: set `VITE_GOOGLE_CLIENT_ID`
- [ ] Run `npm run test:all` — all green
- [ ] `npm run build` — no TypeScript errors
- [ ] Push to GitHub
- [ ] Connect repo to Netlify, set environment variables
- [ ] Deploy — verify OAuth redirect works on production domain
- [ ] Test on mobile (iOS Safari) — verify swipe gestures and Drive auth