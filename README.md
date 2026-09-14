# PrepMate

PrepMate is a personal interview-prep Progressive Web App built with Vue 3, TypeScript, Vite, Tailwind CSS, Vue Router, Pinia, and `vite-plugin-pwa`.

It supports:
- easy, intermediate, advanced, and basic/HR question banks
- typed and voice answering modes
- local scoring (0-100) against sample answers and key points
- spoken mock interview flow with a JSON-driven coach
- stop-and-summarize session reports
- local persistence for active sessions and last summaries

## Run locally

```bash
npm install
npm run dev
```

App runs on `http://localhost:4174`.

## Build

```bash
npm run build
npm run preview
```

## JSON content files

All editable content lives in `src/data`:
- `easy.json`
- `intermediate.json`
- `advanced.json`
- `basics.json`
- `coach-knowledge.json`

Each question in the first four files must have a non-empty `sampleAnswer` (minimum practical length).  
The loader also accepts `referenceAnswer` or `answer` and normalizes them to `sampleAnswer`.

## Add new questions

1. Open one of the mode files in `src/data`.
2. Add a new object under `questions`.
3. Include:
   - `id`
   - `question`
   - `sampleAnswer` (full answer, not placeholder text)
4. Optional fields:
   - `category`, `keyPoints`, `hints`, `followUps`, `tags`, `voicePrompt`

If `sampleAnswer` is missing or too short, the app shows a clear validation error with file and id.

## iPhone install steps

1. Open PrepMate in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch from the new PrepMate icon for standalone mode.

## Notes

- No auth, backend, or external LLM API is required.
- Coach replies are retrieval/template-based from local JSON files only.
- If speech recognition is unavailable, typed answering still works.
