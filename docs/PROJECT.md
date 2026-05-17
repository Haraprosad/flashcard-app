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
VITE_GDRIVE_FOLDER_NAME=       # ObsidianSecondBrain
```

No Anthropic API key in the React app. Claude API is only called by the separate Claude Code sync script.

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
 * - 'standard' = Q&A. front is a question, back is the answer.
 * - 'cloze'    = Fill-in-the-blank. front contains {{c1::text}} markers.
 *                The app renders blanks in place of cloze markers.
 *                Each cloze number (c1, c2, ...) is a separate card generated
 *                by the sync script — so one source sentence may produce
 *                multiple FlashCard objects, each blanking a different segment.
 * - 'intuition' = Scenario-first. front paints a vivid picture/analogy,
 *                 back reveals the concept through the scenario.
 *
 * Tiers (progressive disclosure):
 * - 1 = Intuition — vivid scenario, analogy, "what does it feel like?" No jargon.
 * - 2 = Mechanism — how it works, causal chain, precise explanation.
 * - 3 = Formal — equations, specific numbers, edge cases, boundary conditions.
 *
 * The app enforces tier gating: Tier 2 cards only appear in review after
 * the Tier 1 card for the same concept has been rated "Good" or better at
 * least once. Tier 3 only after Tier 2. This prevents premature abstraction.
 */
interface FlashCard {
  id: string;                // Unique, stable. Format: "{filename}-{index}" e.g. "kubernetes-0"
  type: 'standard' | 'cloze' | 'intuition';  // Card format. Defaults to 'standard' if absent.
  tier: 1 | 2 | 3;          // Progressive disclosure level. Defaults to 1 if absent.
  front: string;             // Question / scenario / cloze template with {{cN::text}} markers
  back: string;              // Answer / explanation / revealed cloze text
  topic: string;             // From Obsidian frontmatter: topic field
  tags: string[];            // From Obsidian frontmatter: tags array
  source_file: string;       // Original .md filename in vault
  created_at: string;        // ISO timestamp when card was generated
  concept_id?: string;       // Groups tiered cards for the same concept.
                             // e.g. "entropy" links T1+T2+T3 cards together.
                             // Used for tier gating logic. Optional — if absent,
                             // no tier gating is applied to this card.
}
```

### 4.2 SR state (stored in localStorage, keyed by card ID)

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
```

### 4.3 Rating enum

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
- **Progressive disclosure (tier gating):** Cards with `tier: 2` only appear in review after the Tier 1 card with the same `concept_id` has been rated "Good" or "Easy" at least once. Tier 3 only after Tier 2 is rated "Good" or "Easy". Cards without a `concept_id` are always eligible (no gating).
- **Card type rendering:**
  - `standard` cards: render `front` as question text, `back` as answer text (existing behavior).
  - `intuition` cards: render `front` as scenario text (italic style), `back` as revealed explanation. Same flip interaction.
  - `cloze` cards: render `front` with `{{cN::text}}` replaced by `___` blanks. Back shows full text with the previously-blanked segment highlighted. Tapping a blank reveals it (optional interactive mode).
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
  srState: SRState;                              // loaded from localStorage on init
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
// Database name: flashcard-app-db  |  Version: 1
// Object stores:
//   cards_cache   — keyPath: 'id'     — stores FlashCard[]
//   metadata      — keyPath: 'key'    — stores { key: string, value: any }
//     keys used:
//       'flashcards_version'  → string
//       'flashcards_generated_at' → string
//       'last_synced' → ISO string
```

---

## 10. Google Drive API calls

```typescript
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
- SR state never leaves the browser. There is no cross-device sync of review progress. This is intentional (simplicity).
- The Google OAuth token is stored in Zustand (memory only), never persisted to localStorage or cookies, for security.
- `flashcards.json` is treated as immutable by the React app. The app only reads it, never writes to Drive.
- Card IDs must be stable across sync runs. The Claude Code script must use the same deterministic ID format (`{source_file_basename}-{index}`) so SR state keys survive re-syncs.
- The app must work on mobile browsers (iOS Safari, Android Chrome). Touch gestures are the primary review interaction.
- Tailwind purge is configured to scan all `.tsx` files so unused classes are removed in production.

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