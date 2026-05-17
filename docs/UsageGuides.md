# Flashcard App — Usage Guide

> For: `dev.haraprosad@gmail.com`
> Last updated: 2026-05-17

---

## Contents

1. [System Overview](#1-system-overview)
2. [Data Persistence — What Survives What](#2-data-persistence--what-survives-what)
3. [Setting Up the Drive Backup](#3-setting-up-the-drive-backup)
4. [Writing Notes for the Sync Script](#4-writing-notes-for-the-sync-script)
5. [Flashcard Format Reference](#5-flashcard-format-reference)
6. [Exploration Card Format](#6-exploration-card-format)
7. [Obsidian SR Plugin Compatibility](#7-obsidian-sr-plugin-compatibility)
8. [Troubleshooting](#8-troubleshooting)
9. [Architecture Decisions](#9-architecture-decisions)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Obsidian Vault (in Google Drive)                       │
│  SecondBrainObsidian/02 - Development/my-note.md        │
└────────────────────┬────────────────────────────────────┘
                     │ Claude Code sync script reads notes
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Google Drive / ObsidianSecondBrain/flashcards/         │
│  ├── flashcards.json   ← card content (sync writes)    │
│  └── sr_state.json     ← review history (app writes)   │
└────────────┬───────────────────────┬────────────────────┘
             │ app reads cards        │ app reads + writes SR state
             ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│  React App (browser)                                    │
│  ├── IndexedDB                                          │
│  │   ├── cards_cache    (card content, fast local read) │
│  │   ├── sr_state       (review data, primary store)   │
│  │   └── review_log     (streak + heatmap data)        │
│  └── Zustand (in-memory session state only)             │
└─────────────────────────────────────────────────────────┘
```

**Core loop:**

1. Write notes in Obsidian with `topic:` frontmatter and flashcard markers.
2. Run the Claude Code sync script — it reads your vault and writes `flashcards.json` to Drive.
3. Open the app, sign in with Google. The app fetches `flashcards.json` and caches it locally.
4. Review due cards. After each session, your SR state is written to `sr_state.json` in Drive.
5. On your next login (any device, any browser), the app fetches `sr_state.json` and merges it with your local data — no progress is lost.

---

## 2. Data Persistence — What Survives What

### Where your data lives

| Data | Local store | Drive backup | Notes |
|---|---|---|---|
| Flashcard content | IndexedDB `cards_cache` | `flashcards.json` (read-only by app) | Restored from Drive on any login |
| SR state (intervals, reps) | IndexedDB `sr_state` | `sr_state.json` | **Merged** from Drive on every login |
| Review log (streak/heatmap) | IndexedDB `review_log` | Inside `sr_state.json` | Restored on login |
| Streak data | IndexedDB metadata | Inside `sr_state.json` | Restored on login |
| Exploration progress | IndexedDB metadata | Inside `sr_state.json` | Restored on login |
| Auth token | Zustand memory only | Never stored | Re-authenticated on each page load |

### Scenario-by-scenario

**"I cleared browser cache (HTTP cache / cookies only)"**
IndexedDB is untouched by HTTP cache clears. All your data survives. ✅

**"I cleared all site data (the nuclear option)"**
IndexedDB is wiped. But on your next login, the app fetches `sr_state.json` from Drive and fully restores your SR state, review log, streak, and exploration progress. You lose nothing. ✅

**"I logged out and logged back in"**
IndexedDB is not cleared on logout. On login, the app fetches Drive and merges — any progress made on another device is pulled in. ✅

**"I re-synced my flashcards (ran the sync script again)"**
The sync script only touches `flashcards.json`. Your `sr_state.json` is untouched. Card IDs are stable (`{slug}-{basename}-{index}`), so all SR state keys remain valid. ✅

**"I switched to a new phone / new browser"**
First login fetches `sr_state.json` from Drive. Full state restored: intervals, reps, streak, heatmap, exploration gates. ✅

**"I reviewed cards offline for a week"**
Reviews are saved to IndexedDB immediately. The Drive push is queued (`sr_state_pending_upload` flag in IDB). On your next online session, the pending state is flushed to Drive automatically. ✅

**"The sync script changed my card IDs" (the one real danger)**
If card IDs change, SR state keys become orphaned — the app treats all cards as New.
**Prevention:** Never change the sync script's ID format (`{slug}-{basename}-{index}`).
**Recovery:** Export your SR state before any sync script changes (Settings → Export SR state), then re-import after.

### Merge strategy (Drive + local)

When local and Drive states both have an entry for the same card:

```
winner = (local.reps > remote.reps)  ? local
       : (remote.reps > local.reps)  ? remote
       : (local.last_review > remote.last_review) ? local
       : remote
```

This rule guarantees: **no review is ever rolled back**. The more-reviewed state always wins.

---

## 3. Setting Up the Drive Backup

### One-time setup (first deploy)

**Step 1 — Google Cloud Console:**

1. Open your OAuth 2.0 client in Cloud Console.
2. The app needs scope `https://www.googleapis.com/auth/drive.file`.
   - `drive.file` is narrow: the app can only read/write files it created. It cannot browse your Drive.
   - Replace `drive.readonly` with `drive.file` in the authorized scopes.

**Step 2 — `.env.local`:**

```
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GDRIVE_FOLDER_NAME=ObsidianSecondBrain
VITE_GDRIVE_FLASHCARDS_FILE=flashcards.json
VITE_GDRIVE_SR_STATE_FILE=sr_state.json
```

**Step 3 — Netlify environment variables** (same four keys as above).

**Step 4 — First login after setup:**

The app will not find `sr_state.json` in Drive (it doesn't exist yet). It creates the file automatically on your first completed review session. No manual action needed.

### What the backup file looks like

```json
{
  "version": "1.0",
  "updated_at": "2026-05-17T09:30:00.000Z",
  "device_id": "a3f7c2d1-...",
  "sr_state": {
    "kubernetes-pod-lifecycle-0": {
      "due": "2026-05-20T09:30:00.000Z",
      "stability": 4.2,
      "difficulty": 5.1,
      "reps": 3,
      "lapses": 0,
      "state": 2,
      "last_review": "2026-05-17T09:30:00.000Z",
      "elapsed_days": 0,
      "scheduled_days": 3
    }
  },
  "explored_concepts": ["retrieval-practice", "entropy"],
  "review_log": [
    { "date": "2026-05-17", "count": 12 },
    { "date": "2026-05-16", "count": 8 }
  ],
  "streak_data": { "current": 5, "longest": 14, "last_review_date": "2026-05-17" }
}
```

---

## 4. Writing Notes for the Sync Script

### Required frontmatter

```yaml
---
title: "Retrieval practice beats re-reading by 50% at 1 week"
date: 2026-05-17
tags:
  - permanent
  - learning-science
topic: Learning Science
source: "Roediger & Karpicke (2006). Test-enhanced learning. Psychological Science."
---
```

| Field | Required | Purpose |
|---|---|---|
| `topic` | Yes | Groups cards in the topic browser |
| `tags` | Yes | Filtering; shown on cards |
| `title` | Yes | Must be a claim, not a noun phrase |
| `source` | Recommended | Shown as citation on card backs |

### Folder routing (sync script auto-selects)

| Content type | Drive folder |
|---|---|
| Programming, frameworks, tools, DevOps, system design | `SecondBrainObsidian/02 - Development/` |
| Learning science, neuroscience, psychology, productivity | `SecondBrainObsidian/01 - Notes/Atomic Notes/` |
| Behavioral science, economics, philosophy, history | `SecondBrainObsidian/01 - Notes/Atomic Notes/` |
| Unsure | `SecondBrainObsidian/01 - Notes/Atomic Notes/` |

### Note structure (all sections required)

```markdown
# [Claim-based title — same as frontmatter title]

> [!warning] Generation rule
> Close this note. Write from memory before opening.

## ✍️ Write From Memory First
## 📖 What I Actually Understand
## 🧒 Feynman Explanation
## ⚙️ How It Works — The Mechanism
## ❓ Elaborative Interrogation
## 🔗 Connections to Other Knowledge
## 💡 How I Will Apply This
## ❓ Open Questions
## 🔁 Spaced Review Log
## 🔬 Exploration   ← optional, one per note
## ⚡ Flashcards
```

---

## 5. Flashcard Format Reference

Every card line follows: `[TIER] [TYPE] [concept:slug (optional)] question text #flashcard`
The answer follows on the next line (no `#flashcard` tag on the answer).

### Tier markers

| Marker | Meaning | Card goal |
|---|---|---|
| `[T1]` | Intuition | Vivid scenario, analogy, no jargon — builds the mental hook |
| `[T2]` | Mechanism | How it works, causal chain, precise explanation |
| `[T3]` | Formal | Equations, specific numbers, edge cases, boundary conditions |

### Type markers

| Marker | Format | When to use |
|---|---|---|
| `[intuition]` | Scenario on front, concept revealed on back | T1 cards — always scenario-first |
| `[standard]` | Question on front, answer on back | T2 and T3 cards |
| `[cloze]` | `{{cN::hidden}}` blanks in front, full text on back | Definitions, numbered facts, causal chains |
| `[exploration]` | See Section 6 | One per concept — the full walkthrough |

### Examples

**Intuition card (T1):**

```
[T1] [intuition] concept:retrieval-practice Imagine: You meet someone at a party. The next day you try to remember their name from scratch — struggling, almost failing. A week later you meet them again. Which mental act did more for your memory? #flashcard
Trying to recall from scratch, even imperfectly, did far more. Every retrieval attempt — even a failed one — rewires the neural path for that memory. Passive re-exposure (seeing the name again) barely touches it.
```

**Standard card (T2):**

```
[T2] [standard] concept:retrieval-practice When a student re-reads instead of self-testing, what cognitive error are they making? #flashcard
They are confusing processing fluency (familiarity from seeing the text) with retrieval strength (ability to reconstruct the memory independently). Re-reading feels productive because the material feels easy to process — but that ease does not transfer to exam recall.
```

**Cloze card (T3) — one source line → multiple cards:**

```
[T3] [cloze] concept:retrieval-practice Roediger & Karpicke (2006) found study-test-test produced {{c1::61%}} recall at 1 week vs study-study-study at {{c2::40%}} — a {{c3::21 percentage point}} advantage. #flashcard
Roediger & Karpicke (2006) found study-test-test produced 61% recall at 1 week vs study-study-study at 40% — a 21 percentage point advantage.
```

The sync script expands this into 3 separate cards: one blanks `61%`, one blanks `40%`, one blanks `21 percentage point`.

### Rules (never break these)

- Never write `"What is X?" → "X is Y"` definition cards — weakest possible encoding.
- Every concept needs at least one `[T1]`, one `[T2]`, one `[T3]` card.
- `[T1]` is always `[intuition]` — scenario first, concept revealed second.
- `[T2]` and `[T3]` use `[standard]` or `[cloze]`.
- The app enforces tier gating: T2 cards only appear after T1 is rated Good/Easy. T3 only after T2.
- If a concept has an `[exploration]` block, the app shows it before unlocking T1 cards.

---

## 6. Exploration Card Format

An exploration card is a 4-step interactive walkthrough shown **once** per concept, before any flashcards for that concept are unlocked. It builds the mental model from scratch — flashcards then reinforce it through spaced retrieval.

Write it as the `## 🔬 Exploration` section, **before** `## ⚡ Flashcards`:

```markdown
## 🔬 Exploration
concept: retrieval-practice

===STEP: scenario===
### The Night Before the Exam

You have two friends. Both studied the same chapter yesterday.

**Friend A** read through their notes three more times last night. The material felt
familiar and fluent — they went to bed feeling confident.

**Friend B** closed their notes and spent an hour writing down everything they could
remember. It was hard. They got things wrong. They checked, corrected, tried again.
They went to bed feeling unsure.

Today is the exam. Who scores higher?

===STEP: problem===
### Which study method actually works?

Most students intuitively choose re-reading — it feels productive because the material
*feels familiar* as you read it. But "familiarity" and "being able to recall
independently" are completely different cognitive states.

Which friend encoded the knowledge more durably, and why? Think before reading on.

===STEP: guide===
### Why retrieval practice wins — the mechanism

**The key insight:** Re-reading keeps information *available to the visual system*.
You recognize it. Retrieval practice forces the brain to *reconstruct* the memory
from scratch — and reconstruction is the same act as recalling it on an exam.

**Step by step:**

1. When you re-read, the words trigger pattern-matching in visual cortex. Easy.
   No new memory trace is formed.
2. When you retrieve, the hippocampus must rebuild the memory from distributed
   cortical traces. This reconstruction *strengthens* those traces.
3. Failed retrievals (where you struggled and got it wrong) produce the
   **strongest encoding** — the effort signal tells the brain "this matters,
   consolidate it."

**The numbers (Roediger & Karpicke, 2006 — 200 college students):**

| Study schedule | Recall at 1 week |
|---|---|
| Study → Study → Study → Study | 40% |
| Study → Study → Study → Test | 56% |
| Study → Test → Test → Test | **61%** |

Re-reading felt better in the moment. Students predicted they'd score *higher* with
more re-reading. They were wrong by 21 percentage points.

**Why re-reading feels effective:** Familiarity creates an *illusion of knowing*.
When the material feels easy to process, we mistake that processing ease for mastery.
But processing ease ≠ ability to recall independently.

===STEP: challenge===
### Try it yourself

You're designing a 2-hour study session for a medical student preparing for a
clinical exam in 2 weeks.

**Which schedule produces the best retention at the 2-week mark?**

- [ ] 2 hours reviewing lecture slides (re-reading, highlighting)
- [ ] 1.5 hours reviewing + 30 minutes of practice questions
- [x] 30 minutes reviewing + 1.5 hours of practice questions and self-testing
- [ ] 2 hours of group discussion about the material

Re-reading has the weakest encoding effect of all study strategies. The optimal
allocation shifts most time to active retrieval — even though students feel less
confident immediately after (the "illusion of incompetence"). 75% of time on
testing is consistent with retrieval practice research showing diminishing returns
after 2–3 read-throughs and increasing returns from each additional test attempt.
```

### Format rules

| Rule | Detail |
|---|---|
| `concept:` slug | Must match the `concept:slug` used in the flashcards below — this links the exploration gate to the T1/T2/T3 cards |
| All 4 steps required | `scenario`, `problem`, `guide`, `challenge` — do not skip any |
| Length | Scenario and guide can be as long as needed. Clarity over brevity. |
| Challenge answers | Exactly one `- [x]` correct answer. 2–4 total options. |
| Explanation paragraph | The last paragraph after the options is shown when the user answers incorrectly. |
| Free-text challenge | Omit the bullet list. Add `input: true` on the line after `**Question:**` |
| One per note | Write one exploration block per note — for the single most important concept. |

### What the user sees in the app

```
┌─────────────────────────────────────────────────┐
│  ● ● ○ ○   Concept Introduction                 │
│  Retrieval Practice                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  The Night Before the Exam                      │
│                                                 │
│  You have two friends. Both studied the same    │
│  chapter yesterday...                           │
│                                                 │
│  [long text scrolls here]                       │
│                                                 │
│                          Skip to flashcards     │
│                     ┌──────────────────────┐    │
│                     │     Next →           │    │
│                     └──────────────────────┘    │
└─────────────────────────────────────────────────┘
```

- Filled amber dot = completed step · Amber ring = current step · Gray = upcoming
- "Skip to flashcards" always visible — marks the concept as explored without requiring the challenge
- After completing the challenge correctly: "Start flashcards →" button unlocks the T1 FSRS cards

---

## 7. Obsidian SR Plugin Compatibility

### The popular plugin: `obsidian-spaced-repetition` (st3v3nmw)

- **Algorithm:** SM-2 (modified Anki algorithm)
- **Storage format:** Inline comment `<!--SR:!2026-05-20,4,270-->` and/or frontmatter `sr-due`
- **Compatibility with this app:** ❌ Not suitable for ongoing sync

SM-2 and FSRS use fundamentally different parameters. SM-2 stores `(due_date, interval, ease_factor)`. FSRS stores `(stability, difficulty, state)`. There is no lossless conversion between them.

**What you can do:** One-time import. The sync script can read SM-2 frontmatter from your existing reviewed notes and convert them to approximate FSRS initial values (setting `reps`, `stability`, `state` from the SM-2 ease and interval). This runs once and is not reversible.

### The FSRS-native plugin: `obsidian-recall` (obsidian-fsrs)

- **Algorithm:** FSRS v4/v5 — same algorithm as `ts-fsrs` used in this app
- **Storage format:** Note frontmatter:

  ```yaml
  sr-due: 2026-05-20
  sr-stability: 4.2
  sr-difficulty: 5.1
  sr-elapsed_days: 0
  sr-scheduled_days: 3
  sr-reps: 3
  sr-lapses: 0
  sr-state: 2
  sr-last_review: 2026-05-17
  ```

- **Compatibility:** ✅ Full two-way bridge possible

**How the bridge works:**

1. Install `obsidian-recall` in Obsidian.
2. Run the sync script with `--write-fsrs-frontmatter` flag.
3. The sync script reads `sr_state.json` from Drive, finds the matching card for each note, and writes FSRS frontmatter fields back to the note file.
4. Obsidian's plugin reads the frontmatter and shows the correct due date in its review queue.
5. **Result:** Review in the web app on your phone, or in Obsidian on your desktop — both using the identical FSRS schedule from the same `sr_state.json`.

---

## 8. Troubleshooting

### "My review progress is gone after clearing my browser"

The Drive backup restores everything on next login.

1. Sign in with Google.
2. The app fetches `sr_state.json` from Drive automatically.
3. If the merge spinner shows ("Syncing your progress…"), wait for it to finish.
4. Your cards, intervals, streak, and heatmap are restored. ✅

If you see a message "No Drive backup found": your first session after setup had not yet been completed. Check Settings → "Sync now" to trigger a manual push.

### "Cards I've reviewed keep coming back as New"

Card IDs changed — SR state keys are orphaned. This happens if:

- The sync script's filename format changed
- A source note was renamed
- The `{slug}` prefix changed

**Fix:** Before any sync script changes, go to Settings → "Export SR state" and save the JSON file locally. After re-syncing, go to Settings → "Import SR state" to restore.

**Prevention:** The ID format `{slug}-{basename}-{index}` must never change once cards are in use.

### "The exploration card keeps appearing on every session"

The `explored_concepts` list in storage was cleared. Fix:

1. Tap "Skip to flashcards" — this re-marks the concept as explored without redoing the walkthrough.
2. Your flashcards then unlock immediately.

### "Drive backup isn't updating"

Check:

1. **Scope:** Google OAuth must include `drive.file` (not just `drive.readonly`). Check in Google Cloud Console → OAuth client → Authorized scopes.
2. **Network:** The push is silent and non-blocking. Check Settings → "Last synced to Drive" timestamp.
3. **Manual trigger:** Settings → "Sync now" forces an immediate push.
4. **Pending flag:** If you reviewed offline, the push was queued. It flushes automatically on your next online session.

### "I want to see my review history in Obsidian"

See Section 7 — set up the `obsidian-recall` plugin bridge. After running the sync script with `--write-fsrs-frontmatter`, each note's frontmatter shows the current FSRS state, and Obsidian's plugin builds its review queue from that.

---

## 9. Architecture Decisions

| Decision | Rationale |
|---|---|
| IndexedDB over localStorage for SR state | `localStorage` is the first thing browsers clear under storage pressure — Safari on iOS is especially aggressive. IndexedDB is classified as user data and survives normal cache clears. Both are vulnerable to "Clear all site data" — Drive backup covers that. |
| `drive.file` scope, not `drive.appdata` | `drive.appdata` stores files in a hidden folder the user cannot see or access. `drive.file` stores `sr_state.json` in `ObsidianSecondBrain/` where the user can inspect, download, or manually restore it. Data ownership matters for a study tool. |
| All state in one `sr_state.json` | Bundling SR state + explored_concepts + review_log + streak_data in one file means a single Drive fetch restores everything. Separate files would require multiple round trips and partial-restore edge cases. |
| Merge strategy: highest reps wins | No review is ever rolled back. If two devices both reviewed the same card, the more-advanced state wins. This is safe because FSRS re-schedules from whatever state it receives — the worst case is a slightly shorter next interval. |
| FSRS over SM-2 | FSRS predicts memory retention using a mathematical model fitted to 20M+ real reviews (Ye et al., 2024). SM-2 uses fixed heuristics from 1987. FSRS achieves 5–10% better retention on identical review budgets. Never implement FSRS manually — use `ts-fsrs`. |
| One exploration card per concept | Exploration is expensive to write well. One rich walkthrough per concept is more valuable than four mediocre ones. The tier system (T1→T2→T3 flashcards) handles progressive depth after the exploration unlocks. |
| Exploration state in `sr_state.json` backup | `explored_concepts` travels with the rest of the backup. If you switch devices, you don't redo explorations you've already completed. |
