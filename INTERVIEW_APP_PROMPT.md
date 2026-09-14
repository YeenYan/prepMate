# Copy-paste prompt: Interview Prep PWA

Copy everything between the `PROMPT START` and `PROMPT END` markers. Paste it into Cursor (or another coding agent) together with your Pocketflow folder and UI screenshot.

---

PROMPT START

# Build “PrepMate” — a personal interview-prep PWA

Build a complete, production-quality **personal interview preparation web app** named **PrepMate** for my own use.

**Create / write the app in this folder (project root):**

`D:\1_PERSONAL_PROJECT\2_prepMate`

If this folder already exists and only contains this prompt (or is empty), scaffold PrepMate **inside that same directory**. Do not nest another extra project folder unless the directory already has unrelated files.

Model the **stack, project structure, coding style, component patterns, and PWA setup** on my existing project **Pocketflow**. Pocketflow lives at:

`D:\1_PERSONAL_PROJECT\pocketflow`

Open Pocketflow, inspect it first, and **reuse the same tech and conventions**. Do not invent a different stack.

## 1. What this app is

A mobile-first Progressive Web App I can add to my iPhone Home Screen (Safari → Share → Add to Home Screen) and use without a store install.

I practice interview questions in three difficulty modes. The app:

- loads questions from JSON — **every question has a full sample answer**
- asks them in random order
- lets me answer by **typing** or **voice**
- scores my answer against that sample answer (0–100%)
- after scoring, shows the **sample answer** plus what was missing, wrong, or should be added
- can run a spoken mock interview with a built-in coach that talks to me
- lets me stop mid-session and shows a grade summary of everything I already answered

This is a **personal coach**, not a SaaS. No auth, no database, no accounts, no cloud backend required. All question banks and the AI knowledge base live in local JSON files in the repo.

## 2. Tech stack (must match Pocketflow)

Inspect Pocketflow and match it. Expected baseline (confirm against Pocketflow and follow whatever it actually uses):

- Vue 3 (Composition API, `<script setup>`)
- TypeScript (strict)
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- PWA: same approach as Pocketflow (`vite-plugin-pwa` / Workbox if that is what Pocketflow uses)
- Same folder layout, naming, lint, and formatting as Pocketflow

Do **not** switch to React, Next.js, Nuxt, or a different UI kit unless Pocketflow already uses it. Do **not** add a second component library.

If Pocketflow already has a design system (colors, buttons, cards, bottom nav, toasts), reuse those patterns. If a UI screenshot is attached to this prompt, **the screenshot wins for visual design**. Pocketflow wins for architecture.

## 3. UI / UX (critical)

I will attach a **sample UI image**. Recreate that look closely:

- same layout, spacing, typography, radius, and color mood
- mobile-first; also usable on desktop
- large tap targets, safe-area padding for iPhone notch/home indicator
- calm, focused practice UI — not a marketing landing page
- real copy only (no lorem, no “Welcome to your app”)

### Screens to build

1. **Home / Hub**
   - App name: **PrepMate** (unless the screenshot uses a different title — then match the screenshot)
   - Three mode cards: Easy, Intermediate, Advanced
   - Entry for **Basic / HR questions** (Tell me about yourself, salary, etc.)
   - Entry for **Voice mock interview** (spoken conversation with the in-app coach)
   - Shortcut to last session / resume if one exists
   - Shortcut to history / last grade summary

2. **Mode lobby** (after tapping a mode)
   - Short description of the mode
   - Question count in that bank
   - Start Assessment
   - Optional: practice one random question

3. **Question session**
   - Progress: Question X of Y (Y = remaining in shuffled deck, or “Question X” if unlimited shuffle)
   - Mode badge
   - Question text (large, readable)
   - Optional tags (topic, category) if present in JSON
   - Answer area with **two input modes**, user can switch anytime:
     - **Type:** textarea
     - **Voice:** microphone button, live transcript into the same answer field, then user can edit the transcript
   - Actions: Submit answer, Skip, Stop Assessment
   - After submit: score ring/bar (0–100%), feedback, **the full sample answer for that question**, “what to add / change”
   - Then: Next question

4. **Voice mock interview (conversation mode)**
   - The app **speaks** a random question (Web Speech Synthesis) using its own voice
   - I **answer by voice** (Web Speech Recognition); typed fallback still available
   - After each answer the coach speaks a short critique + score, then can read or show the **sample answer**, then asks a follow-up or the next question
   - Visible transcript of the conversation
   - Controls: mute coach voice, stop assessment, skip question, repeat question
   - Works as a back-and-forth coaching convo, not a single one-shot answer

5. **Grade summary (after Stop Assessment or when the deck is finished)**
   - Overall score (average of answered questions)
   - Counts: answered / skipped / remaining
   - Per-question breakdown: question, my answer, **sample answer**, score, short feedback
   - Letter or label (e.g. Excellent / Strong / Needs work) derived from average
   - Actions: Review weak answers, Practice again (same mode, reshuffle), Back home
   - Persist last summary in `localStorage` so I can reopen it

6. **Empty / loading / error**
   - Empty bank: “No questions in this JSON yet”
   - Mic permission denied: clear message + switch to typing
   - Speech not supported (some iOS cases): hide voice or disable with explanation, typing still works
   - JSON parse failure: show which file failed

Keep the chrome iPhone-friendly: sticky bottom actions on the session screen, no tiny hover-only controls.

## 4. Five JSON files (source of truth)

Put them in something like `src/data/` (or Pocketflow’s equivalent static data folder). Ship **real sample content**, not empty stubs — enough questions to practice (at least 12–20 per mode, 10+ basic/HR, and a solid coach knowledge file).

**Hard rule — sample answer on every question:** every object in `easy.json`, `intermediate.json`, `advanced.json`, and `basics.json` MUST include a complete `sampleAnswer`. No question may ship with an empty string, `"TBD"`, `"Full model answer..."`, or a one-line stub. The sample answer is the model response I study after I submit, and it is also the scoring reference.

### File 1 — `easy.json`

Easy technical / role questions. Each question includes a full `sampleAnswer`.

### File 2 — `intermediate.json`

Intermediate questions. Each question includes a full `sampleAnswer`.

### File 3 — `advanced.json`

Advanced / deep / system-design / tricky questions. Each question includes a full `sampleAnswer`.

### File 4 — `basics.json`

Classic HR / personal interview questions. Each question includes a full first-person `sampleAnswer`. For example:

- Tell me about yourself
- What is your expected salary?
- Why do you want this role?
- What are your strengths / weaknesses?
- Tell me about a conflict with a teammate
- Where do you see yourself in 5 years?
- Why should we hire you?
- Questions to ask the interviewer

Example `sampleAnswer` for “Tell me about yourself” (still a template, but a full answer):

> I’m a [role] with [years of experience] building [stack] products. Recently at [company] I [specific achievement with a number]. I enjoy [strength tied to the job]. I’m talking with you because this role focuses on [role need], which matches how I like to work.

Every basics question needs a sample of that completeness.

### File 5 — `coach-knowledge.json`

Knowledge base for the **in-app personal AI coach**. Not a question bank. It is the coach’s reference for:

- how to score answers
- STAR method
- salary negotiation phrasing
- what a strong vs weak answer looks like
- follow-up questions
- common mistakes
- encouragement style
- domain notes (software engineering interviews unless Pocketflow’s domain suggests otherwise — default to **software / web engineering interviews**, written so I can edit JSON later)

The coach must **only** use these JSON files as its knowledge. Do not call an external LLM API. No OpenAI/Anthropic keys. Retrieval + local scoring + templated coaching language from `coach-knowledge.json`.

### JSON schemas (use these shapes)

**Question bank files** (`easy.json`, `intermediate.json`, `advanced.json`, `basics.json`):

```json
{
  "mode": "easy",
  "title": "Easy",
  "description": "Foundational questions. Aim for a clear, complete answer in 1–2 minutes.",
  "questions": [
    {
      "id": "easy-001",
      "category": "JavaScript",
      "question": "What is the difference between let, const, and var?",
      "sampleAnswer": "var is function-scoped, can be redeclared, and is hoisted then initialized as undefined, which leads to bugs. let and const are block-scoped and hoisted into a temporal dead zone until their line runs, so using them early throws. let can be reassigned; const cannot be reassigned, though object properties can still change. In modern code I use const by default, let when the value must change, and I do not use var.",
      "keyPoints": [
        "scope differences (function vs block)",
        "hoisting and temporal dead zone",
        "reassignment / redeclaration rules",
        "prefer const, then let, avoid var"
      ],
      "hints": ["Talk about scope first, then hoisting."],
      "followUps": ["When would you still use var?"],
      "voicePrompt": "What is the difference between let, const, and var?"
    }
  ]
}
```

`sampleAnswer` is **required**. Write it as a complete spoken/written interview answer (several sentences, not a title). Technical questions: accurate, structured, in first person where natural (“I would…”). Basics/HR questions: first-person templates with placeholders like `[years of experience]`, `[role]`, `[stack]` — still a full answer I can adapt, never a heading only.

If incoming JSON uses `referenceAnswer` or `answer`, normalize it to `sampleAnswer` on load. Reject questions that still have no sample answer after that.

**Coach knowledge** (`coach-knowledge.json`):

```json
{
  "persona": {
    "name": "Coach",
    "voiceStyle": "Calm, direct, specific. Short spoken sentences. No fluff.",
    "greeting": "Ready when you are. I will ask a question, you answer, then I will score it and tell you what to tighten."
  },
  "scoringRubric": [
    {
      "id": "coverage",
      "weight": 0.5,
      "description": "How many key points from the sample answer appear in the user answer."
    },
    {
      "id": "accuracy",
      "weight": 0.3,
      "description": "No contradictions with the sample answer."
    },
    {
      "id": "clarity",
      "weight": 0.2,
      "description": "Structure, completeness, STAR where behavioral."
    }
  ],
  "feedbackTemplates": {
    "high": ["Strong. You covered {covered}. To push it further, add {missing}."],
    "mid": ["You have the idea. Missing: {missing}. Reword: {suggestion}."],
    "low": ["Start over with this structure: {structure}. Must include: {missing}."]
  },
  "insights": [
    {
      "id": "star",
      "tags": ["behavioral", "basics"],
      "guidance": "Situation, Task, Action, Result. Spend most time on Action and Result."
    }
  ],
  "conversation": {
    "askNext": ["Next question.", "Let us try another one."],
    "encourage": ["Good. Lock that phrasing in."],
    "correct": ["Drop {wrong}. Say {better} instead."]
  }
}
```

I must be able to add/edit questions later by only changing JSON — the app reads files at build/runtime, no hardcoded question strings in Vue components. When I add a question, I must also add its `sampleAnswer`.

Include a small importer/normalizer so slightly messy JSON still loads (missing optional fields get defaults). `sampleAnswer` is not optional.

## 5. Core behavior

### 5.1 Analyze JSON → app questions

On app start (or when entering a mode), load the matching JSON, validate, and map into typed objects (`InterviewQuestion`, `ModeBank`, `CoachKnowledge`). Convert each record into something the session UI can render: prompt, **sample answer**, key points, category, follow-ups.

Validation must fail (and name the file + `id`) if any question is missing `sampleAnswer` / `referenceAnswer` / `answer`, or if the sample is shorter than ~40 characters.

If JSON is invalid, show a readable error naming the file and field.

### 5.2 Three modes + basics

- Easy → `easy.json`
- Intermediate → `intermediate.json`
- Advanced → `advanced.json`
- Basic / HR is a fourth practice bank from `basics.json` (same session engine as modes, different deck)
- Voice mock interview can draw from the selected bank **or** mix banks — default: user picks a bank first, then “Start voice mock”

### 5.3 Randomization

When a session starts:

- shuffle a copy of the bank (Fisher–Yates)
- never show the same question twice in one session until the deck is exhausted
- if they practice again, reshuffle
- persist `sessionId`, mode, remaining queue, and answers in `localStorage` so a refresh does not wipe an in-progress assessment

### 5.4 Answering: type or voice

Every question has both:

1. **Typing** — textarea, submit enabled when there is non-empty text
2. **Voice** — tap mic, speak, transcript fills the textarea (editable), tap mic again to stop, then Submit

Use the Web Speech API:

- `webkitSpeechRecognition` / `SpeechRecognition` for input
- `speechSynthesis` for the coach voice

Implement a thin `useSpeech()` composable with: start, stop, transcript, interim transcript, speaking state, supported flags, error.

iPhone / Safari / standalone PWA constraints:

- trigger mic and speech from a user gesture
- request mic permission with a clear pre-prompt
- if recognition is unavailable, keep typing; still allow the coach to **speak** questions via synthesis when possible
- `lang` default `en-US`
- do not block the whole app if voice fails

### 5.5 Score the answer (0–100%) and coach the user

After Submit, compare the user answer to that question’s `sampleAnswer` + `keyPoints`.

**Local scoring (required, no API):**

- normalize text (lowercase, strip punctuation, collapse whitespace)
- key-point coverage: each `keyPoints` item scores if its important tokens / phrase appear (fuzzy: allow close token overlap, not only exact string)
- lexical overlap with the sample answer (token Jaccard or similar)
- length / completeness: very short answers cap the score
- contradiction lite: if the user asserts a key point’s opposite in a naive way, penalize (keep this simple; do not over-engineer NLP)
- weighted mix from `coach-knowledge.json` rubric, clamped 0–100, integer display

Then show:

- numeric score and a short label (e.g. 0–39 Needs work, 40–69 Getting there, 70–84 Solid, 85–100 Interview ready)
- **Sample answer** — always show the full `sampleAnswer` for this question (collapsible on mobile, expanded by default after submit)
- **What you got right** (covered key points)
- **What was missing or wrong** (uncovered key points + a concrete suggestion of what to add/change)
- Optional improved outline: 3–5 bullets of a stronger answer, derived from key points + the sample answer (not a second LLM)

Store `{ questionId, userAnswer, score, feedback, covered, missing }` on the session.

### 5.6 In-app personal AI (JSON-only)

A coach that:

- greets using `coach-knowledge.json` persona
- asks a random question from the chosen bank **out loud**
- listens to my spoken answer
- scores it
- speaks a short insight (what to change/add) using templates + retrieved snippets from `coach-knowledge.json` (match by category / tags / keywords in the question)
- may ask one follow-up from the question’s `followUps` or from knowledge insights
- then moves to the next random unused question
- never invents facts that are not in the JSON banks or knowledge file
- never calls an external model

Think of it as scripted RAG: retrieve relevant knowledge entries, fill templates, speak them.

Also provide a **text chat panel** on the voice mock screen (and optionally a dedicated Coach tab) so I can type “how should I answer salary?” and it answers from `basics.json` + `coach-knowledge.json` by retrieval (keyword / key-point match). If nothing matches, say it does not have that in its notes and suggest which JSON file I should add it to.

### 5.7 Stop Assessment → grade summary

At any time after at least one submitted answer, **Stop Assessment** is available.

Stopping:

- freezes the session (no more questions)
- computes overall grade = average of submitted scores (skipped questions are listed but not averaged, or count as 0 — **default: skipped are excluded from the average**, but shown as Skipped)
- navigates to the Grade Summary screen
- lists every answered question with: question text, my answer, score, **full sample answer**, missing points
- overall stats: average %, best score, weakest question, count answered

If they have answered e.g. 8 questions and stop, the summary is for those 8.

If they finish the deck, auto-open the same summary.

## 6. App information architecture

Suggested routes (adapt names to Pocketflow style):

- `/` home
- `/mode/:mode` lobby (`easy` | `intermediate` | `advanced` | `basics`)
- `/session/:mode` typed practice
- `/mock/:mode` voice conversation mock
- `/summary/:sessionId` grade summary
- `/coach` optional knowledge chat

State (Pinia):

- `useBanksStore` — loaded JSON, status
- `useSessionStore` — shuffle queue, current index, answers, status (`idle` | `answering` | `feedback` | `stopped` | `completed`)
- `useCoachStore` — conversation turns, speaking/listening flags

Composables:

- `useSpeech.ts`
- `useScoring.ts`
- `useCoach.ts` (retrieve + template)
- `useSessionPersistence.ts`

## 7. PWA / iPhone

- Installable PWA: manifest, icons (generate simple icons if Pocketflow has a pattern), theme color matching the screenshot
- `display: standalone`, `start_url` `/`, apple web app capable meta
- Offline: cache the app shell + JSON banks so practice works without network after first load (same strategy as Pocketflow)
- Service worker must not break voice (mic is runtime, not cached)
- Test layout at iPhone width (~390px) and desktop
- Prevent accidental pull-to-refresh from wiping a session (session is in Pinia + localStorage)

## 8. Content to ship

Write original practice content. Default domain: **software engineering / web** (JS/TS, Vue, HTTP, CSS, system design lite, behavioral). I will edit JSON later for my real interviews.

Minimum content:

- Easy: ≥ 15 questions, **each with a full sampleAnswer**
- Intermediate: ≥ 15 questions, **each with a full sampleAnswer**
- Advanced: ≥ 12 questions, **each with a full sampleAnswer**
- Basics/HR: ≥ 12 including the examples listed above, **each with a full first-person sampleAnswer** I can adapt (do not invent a fake biography — use placeholders like `[years of experience]`, `[role]`, `[stack]` that I can search-replace)
- Coach knowledge: persona, rubric, templates, STAR, salary, “tell me about yourself” structure, filler-word tips, how to use numbers in answers
- Do not ship any question without a real sample answer. The loader should skip or error, never render a blank “Sample answer” panel.

## 9. Quality bar

- TypeScript types for every JSON shape; validate on load; `sampleAnswer: string` is required on `InterviewQuestion`
- No `any`
- Accessible labels on mic, submit, stop
- Reduced-motion: skip heavy animation if `prefers-reduced-motion`
- Do not add auth, backend, database, or paid APIs
- README: what the app is, how to run, how to add questions to JSON, how to install the PWA on iPhone
- Dev server on an uncommon port (not 3000/5173/8080 if you can choose), bound so it can be previewed

## 10. Implementation order

1. Scaffold using Pocketflow’s same Vue/TS/Tailwind/PWA setup (official Vue scaffold only if you cannot clone structure from Pocketflow).
2. Types + 5 JSON files + loader. Fill a real `sampleAnswer` on **every** question before wiring UI.
3. Home + mode lobby + typed session + scoring + stop/summary.
4. Voice input + coach TTS + mock conversation + JSON retrieval chat.
5. PWA manifest/offline + iPhone polish + empty/error states.
6. Persist sessions and last summary.

Build one complete usable app, not a demo with fake buttons. When UI screenshot is attached, match it before polishing extras.

## 11. Out of scope

- User accounts, cloud sync, real LLM APIs
- Native iOS app
- Multiplayer / sharing
- Admin CMS (JSON files are the CMS)

PROMPT END
