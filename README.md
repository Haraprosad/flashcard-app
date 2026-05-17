# Concept Snap

> Your Obsidian notes, turned into a science-backed spaced-repetition system.  
> Built for the way memory actually works — not the way it *feels* like it works.

---

## The problem with how most people study

Re-reading feels productive. Highlighting feels thorough. Watching a lecture a second time feels efficient.

None of it works very well.

Roediger & Karpicke (2006) ran a controlled study with 200 college students. One group studied material, then re-read it three more times. Another group studied once, then tested themselves three times. At the one-week mark:

| Study method | Recall at 1 week |
| --- | --- |
| Study → Study → Study → Study | 40% |
| Study → Study → Study → Test | 56% |
| Study → Test → Test → Test | **61%** |

The re-readers *predicted* they would score higher. They were wrong by 21 percentage points.

This app is built on that research — and on every subsequent decade of memory science that has refined and extended it.

---

## What this app does

**Source:** Your Obsidian vault, stored in Google Drive.  
**Format:** Structured markdown notes → flashcards → spaced review sessions.  
**Algorithm:** FSRS v5 (Free Spaced Repetition Scheduler) — the state of the art, trained on 20 million real reviews.  
**Backend:** None. Everything runs in your browser. Your data lives in IndexedDB and Google Drive.

```
Obsidian note
    ↓  Claude Code sync script
flashcards.json in Google Drive
    ↓  React app (browser)
IndexedDB (local cache)
    ↓  FSRS scheduler
Review session → sr_state.json → Google Drive
    ↓  Next login on any device
Full state restored, nothing lost
```

---

## The learning science, built into every interaction

### 1. Retrieval practice — the engine

Every card you review forces you to reconstruct a memory from scratch before seeing the answer. This reconstruction act — not re-reading, not re-watching — is what actually strengthens the memory trace.

Even *failed* retrievals strengthen encoding. When you struggle, almost remember, and then see the answer, the neural path for that memory is reinforced more than if it had come easily.

### 2. Spaced repetition — the scheduler

FSRS (Ye et al., 2022) models memory as a mathematical function of two parameters:

- **Stability** — how long a memory can survive before it decays below a retrieval threshold
- **Difficulty** — how much each review increases stability

After each rating (Again / Hard / Good / Easy), FSRS computes the optimal next review date — the *last possible moment* before the memory would fall below 90% retention. This is the most efficient possible use of review time: no reviewing too early, no forgetting.

FSRS achieves 5–10% better retention than SM-2 (the algorithm behind Anki) on identical review budgets, because it uses a continuous model rather than fixed heuristics.

### 3. Concept formation before retrieval — exploration cards

You cannot retrieve what you never encoded. Before any flashcards for a new concept unlock, the app shows a 4-step **"Build the mental model"** walkthrough:

```
● ● ● ○   Build the mental model
Retrieval Practice

Step 3 of 4: Guide
──────────────────

Why retrieval practice wins — the mechanism

The key insight: Re-reading keeps information
available to the visual system. You recognize it.
Retrieval practice forces the brain to reconstruct
the memory from scratch — and reconstruction is
the same act as recalling it on an exam.

                              [ Next → ]
```

The four steps follow a deliberate cognitive sequence:
1. **Scenario** — concrete situation that makes the concept tangible (no jargon)
2. **Problem** — asks you to commit to an explanation before seeing one
3. **Guide** — mechanism, causal chain, supporting data
4. **Challenge** — apply the concept to a new situation

This sequence follows the **elaborative interrogation** and **concrete examples** principles (Dunlosky et al., 2013, ranked #1 and #3 among ten study techniques for effectiveness).

### 4. Confidence calibration — surfacing the illusion of knowing

Before the challenge options appear, the app asks: **Low / Medium / High confidence?**

The options are locked until you choose.

This is not a UX flourish. Koriat & Bjork (2006) showed that learners systematically overestimate how well they know material they've just read — the "illusion of knowing." Forcing a confidence commitment *before* answering activates genuine self-monitoring rather than answer-hunting.

High-confidence wrong answers are the most valuable learning events. The **hypercorrection effect** (Butterfield & Metcalfe, 2001): errors made with high confidence are better remembered after correction than errors made with low confidence, because the mismatch between expected and actual performance triggers deeper processing.

The app tracks your first-try accuracy per concept. A high-confidence wrong answer on first attempt is a signal, not a failure.

### 5. Delayed explanation reveal — the benefit of uncertainty

When you answer the challenge incorrectly, the explanation is *not* shown immediately. A **"See why →"** button appears. The explanation only renders after you tap it.

Butler, Karpicke, & Roediger (2007) found that a brief delay before seeing corrective feedback improves long-term retention compared to immediate reveal. The moment of uncertainty — *why was I wrong?* — heightens attention and makes the correction more memorable.

### 6. Pre-session recall prompt — encoding before exposure

At the start of each topic review session, before the first card appears:

```
Before we start —
what do you already know about Kubernetes?

Take 30 seconds to think.
No input needed — just think.

[ I've thought about it  →  Continue ]
```

Kornell & Bjork (2008): attempting to recall what you know *before* studying new material strengthens the encoding of that material — even when the recall attempt is completely wrong. The pre-retrieval attempt:
- Activates existing memory schemas that new information binds to
- Creates a predictive error signal that deepens correction encoding

The prompt requires no typing. It takes 5 seconds. The cognitive benefit is real and measurable.

### 7. Interleaved card order — preventing the blocked-practice illusion

Within each session, cards are served in interleaved order — not concept-by-concept:

```
T1 (Retrieval Practice) → T1 (Spaced Repetition) → T1 (Elaboration)
→ T2 (Retrieval Practice) → T2 (Spaced Repetition) → T2 (Elaboration)
```

Not:
```
T1→T2→T3 (Retrieval Practice) → T1→T2→T3 (Spaced Repetition)  ← blocked
```

Rohrer & Taylor (2007): interleaved practice produced **43% better delayed recall** than blocked practice. Blocking feels more fluent — learners rate it as more effective. It isn't. Interleaving forces you to identify *which* retrieval strategy applies to each problem, a metacognitive step blocked practice bypasses.

### 8. Progressive disclosure — tier gating

Every concept has three tiers of cards:

| Tier | Type | Goal |
| --- | --- | --- |
| T1 | Intuition | Scenario-first mental hook — no jargon |
| T2 | Mechanism | Causal chain, precise explanation |
| T3 | Formal | Equations, edge cases, exact numbers |

T2 cards only unlock after T1 is rated Good/Easy. T3 only after T2. This enforces **the concreteness-to-abstraction sequence** — learners who encounter abstract principles before concrete examples show significantly weaker long-term retention (Schwartz & Bransford, 1998).

### 9. Skip friction — protecting desirable difficulty

The exploration walkthrough is effortful by design. Bjork & Bjork (2011) coined the term **desirable difficulties**: learning conditions that slow initial acquisition but improve long-term retention. The exploration walkthrough is a desirable difficulty. A visible one-tap skip defeats the mechanism entirely.

The skip is accessible — it lives behind a ⋯ overflow menu with a two-step confirmation:

> *"Skip building the mental model?"*  
> *"Your flashcards will unlock, but the concept won't be anchored."*

This is not a guilt message. It is a factual description of what the skip costs. The two-tap path ensures skipping is deliberate, not accidental.

---

## Card format overview

Three card types, three tiers. Every concept needs all three tiers, in this order:

**T1 — Intuition (always scenario-first):**
```
[T1] [intuition] concept:retrieval-practice
Imagine: You meet someone at a party. You try to remember their
name the next day — struggling, almost failing. Which mental act
did more for your memory: the struggle, or seeing the name again? #flashcard
The struggle. Every retrieval attempt — even a failed one — rewires
the neural path for that memory. Passive re-exposure barely touches it.
```

**T2 — Mechanism:**
```
[T2] [standard] concept:retrieval-practice
When a student re-reads instead of self-testing, what cognitive
error are they making? #flashcard
Confusing processing fluency (familiarity) with retrieval strength
(ability to reconstruct independently). The ease of re-reading
doesn't transfer to exam recall.
```

**T3 — Formal (cloze → multiple cards):**
```
[T3] [cloze] concept:retrieval-practice
Roediger & Karpicke (2006) found study-test-test produced
{{c1::61%}} recall at 1 week vs study-study-study at {{c2::40%}} —
a {{c3::21 percentage point}} advantage. #flashcard
Roediger & Karpicke (2006) found study-test-test produced 61%
recall at 1 week vs study-study-study at 40% — a 21 percentage
point advantage.
```

The sync script expands each `{{cN::...}}` into a separate card. One source line, three cards, no duplication.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TypeScript + Vite 5 |
| Styling | Tailwind CSS v3 + CSS variables |
| State | Zustand (global) + React hooks (local) |
| Animation | Framer Motion |
| FSRS algorithm | `ts-fsrs` — never implemented manually |
| Local storage | `idb` (IndexedDB) — not localStorage |
| Auth + sync | Google OAuth 2.0 + Drive API (`drive.file` scope) |
| Testing | Vitest + Cucumber BDD + Playwright E2E |
| Deploy | Netlify (static, no backend) |

**Test status:** 110/110 BDD scenarios green · TypeScript strict · `tsc --noEmit` clean

---

## Data persistence

Your review data survives everything:

| Event | What happens |
| --- | --- |
| Browser cache cleared | IndexedDB untouched. Nothing lost. |
| All site data wiped | IndexedDB cleared. Drive restore on next login. |
| New device / browser | First login pulls `sr_state.json` from Drive. Full restore. |
| Offline for a week | Reviews saved to IndexedDB. Drive push queued, auto-flushes on reconnect. |
| Logged out and back in | IndexedDB intact. Drive merge pulls any progress from other devices. |

**Merge rule:** When local and Drive SR states conflict, the state with more reps wins. No review is ever rolled back.

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/Haraprosad/concept-snap.git
cd concept-snap
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_GOOGLE_CLIENT_ID=your-oauth-client-id
VITE_GDRIVE_FOLDER_NAME=ObsidianSecondBrain
VITE_GDRIVE_FLASHCARDS_FILE=flashcards.json
VITE_GDRIVE_SR_STATE_FILE=sr_state.json
```

### 3. Google Cloud Console (one-time)

1. Create an OAuth 2.0 Web Client ID.
2. Add `http://localhost:5173` to authorized JavaScript origins.
3. Authorized scopes: `https://www.googleapis.com/auth/drive.file`

### 4. Run locally

```bash
npm run dev
```

Open `http://localhost:5173`, sign in with Google.

### 5. Write your first note

See [docs/UsageGuides.md](docs/UsageGuides.md) for the complete note format, flashcard syntax, and exploration card template.

For AI-assisted note creation, see the **Creating Notes with AI** section below.

---

## Creating Notes with AI

Every note in this system follows a strict, science-backed format defined in [`sync/SKILL.md`](sync/SKILL.md). That file encodes 15 learning-science principles (retrieval practice, spaced repetition, elaborative interrogation, progressive disclosure, and more) into a repeatable note template. You do not need to memorise the format — you hand `SKILL.md` to an LLM and give it a topic.

### Approach 1 — Manual (any LLM, any topic)

1. Open [`sync/SKILL.md`](sync/SKILL.md) and copy its full contents.
2. Open your LLM of choice (ChatGPT, Claude, Gemini, etc.).
3. Paste the SKILL.md contents, then add:

   ```text
   Topic: [your topic here]
   ```

4. The LLM produces a complete Obsidian note — title, explanation, flashcards, exploration card, spaced review log — all following the science-backed template.
5. Save the output as a `.md` file into your Obsidian vault in Google Drive (`ObsidianSecondBrain/flashcards/`).
6. In Concept Snap, tap **Sync now** in Settings to load the new topic.

### Approach 2 — Automated (Claude Code + Google Drive MCP)

Claude Code has Google Drive access via MCP (Model Context Protocol). With this wired up, you can generate and save a note in a single command — no copy-paste, no manual file management.

**One-time setup:** ensure the Google Drive MCP server is configured in your Claude Code settings so Claude can write to Drive.

**To create a note:**

Open Claude Code in this repo and run:

```text
@sync/SKILL.md

Create a note for: [your topic]

Save it to Google Drive following the folder rules in SKILL.md.
```

Claude Code will:

1. Read `sync/SKILL.md` in full (the `@` reference loads it into context).
2. Research the topic at expert depth.
3. Write the complete Obsidian note — all sections, all flashcards, exploration card.
4. Save it directly to the correct folder in your Google Drive vault.
5. Report the file path, flashcard count, and remind you to sync.

Then in Concept Snap, tap **Sync now** in Settings. The new topic appears immediately.

### What SKILL.md controls

| Principle | What it produces in the note |
| --- | --- |
| Retrieval practice (Roediger & Karpicke, 2006) | "Write from memory first" prompt at the top of every note |
| Generation effect (Slamecka & Graf, 1978) | Cloze deletions — fill-in-the-blank forces reconstruction |
| Elaborative interrogation (Pressley et al., 1987) | "Why is this true?" section — causal chains, not definitions |
| Self-explanation (Chi et al., 2000) | Plain-language Feynman section — gap detection |
| Spaced repetition (Cepeda et al., 2006) | Review log with exact dates: +1, +7, +30, +90 days |
| Intuition before definition (Schwartz & Bransford, 1998) | Exploration card scenario-first — no jargon on first exposure |
| Progressive disclosure (Vygotsky ZPD) | T1/T2/T3 flashcard tiers — app gates each tier |
| Metacognitive calibration (Koriat & Bjork, 2006) | Confidence prompt before every challenge answer |
| Interleaving (Rohrer & Taylor, 2007) | Cards written in interleaved order across concepts |
| Relational cards (Richland et al., 2007) | Connections section → flashcards that test the relationship |

The LLM is not free-styling the note structure — every section, every card type, every pedagogical mechanism is specified and enforced by `SKILL.md`.

---

## Running tests

```bash
npm run test          # Vitest unit tests
npm run test:bdd      # Cucumber BDD (110 scenarios)
npm run test:e2e      # Playwright E2E
npm run test:all      # Full suite — run before every commit
```

---

## Deploy to Netlify

`netlify.toml` is already configured. GitHub Actions CI/CD is wired up in `.github/workflows/ci-cd.yml`:

- Every push: type-check → lint → Vitest → BDD → E2E
- Merge to `main`: build + deploy to Netlify production
- Pull requests: build + Netlify draft preview URL

Add these secrets to your GitHub repository:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GDRIVE_FOLDER_NAME`
- `VITE_GDRIVE_FLASHCARDS_FILE`
- `VITE_GDRIVE_SR_STATE_FILE`

---

## Design language

**Refined Dark Minimal.** Used at night, on mobile, one thumb. Think Linear meets a high-end reading app.

- **Typography:** DM Serif Display (headings) + DM Sans (body) + JetBrains Mono (code)
- **Base color:** `#0E0E10` — deep, not pure black
- **Accent:** `#F59E0B` amber — used sparingly, always meaningful
- **Radius:** 12px cards · 8px buttons · 6px badges
- **Touch targets:** 44×44px minimum — non-negotiable
- **Accessibility:** WCAG 2.2 AA contrast · keyboard navigable · VoiceOver tested

---

## The research behind this app

| Feature | Research basis |
| --- | --- |
| FSRS scheduling | Ye et al. (2022) — FSRS: A Proposed System for Spaced Repetition |
| Retrieval practice over re-reading | Roediger & Karpicke (2006) — Test-enhanced learning |
| Exploration before flashcards | Schwartz & Bransford (1998) — A time for telling |
| Confidence gating | Koriat & Bjork (2006) — Illusions of competence |
| Hypercorrection on high-confidence errors | Butterfield & Metcalfe (2001) |
| Delayed explanation reveal | Butler, Karpicke & Roediger (2007) — Feedback timing |
| Pre-session recall prompt | Kornell & Bjork (2008) — Learning concepts and categories |
| Interleaved practice | Rohrer & Taylor (2007) — The shuffling of mathematics |
| Desirable difficulties | Bjork & Bjork (2011) — Making things hard on yourself |
| Tier gating (concrete → abstract) | Dunlosky et al. (2013) — Improving students' learning |
| First-attempt tracking | Slamecka & Graf (1978) — Generation effect |

---

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/UsageGuides.md](docs/UsageGuides.md) | Complete usage guide: card format, exploration format, science features, persistence, troubleshooting |
| [docs/TASKS.md](docs/TASKS.md) | Phase-by-phase build checklist |
| [docs/PROJECT.md](docs/PROJECT.md) | Full spec: data contracts, component tree, all feature definitions |
| [docs/BDD-WORKFLOW.md](docs/BDD-WORKFLOW.md) | BDD feature file format and step definition conventions |
| [docs/MEMORY.md](docs/MEMORY.md) | Session state: what's done, what's next, key decisions |

---

## License

MIT
