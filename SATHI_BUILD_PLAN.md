# SATHI — Phase-by-Phase Build Plan (Rev 2)

**Project:** SATHI: Smart AI Teaching and Helpful Intelligence  
**Stack:** React + TypeScript + Vite (PWA) · FastAPI (Python 3.11) · IndexedDB (Dexie) · SQLite → Postgres  
**Target:** Offline-first multilingual AI learning agent for Classes 1–12  
**Last updated:** Incorporates all 42 missing requirements from `SATHI_Missing_Requirements.md` (12 P0, 24 P1, 6 P2)

> [!IMPORTANT]
> **Open decisions that must be settled before coding Phase 1:**
> 1. **Multiple profiles (MR-01):** Demo-only (one profile) or full multi-profile? — touches DB keys and onboarding.
> 2. **Content source (MR-30):** Original team-authored text, or adapted textbook? — decides licence fields.
> 3. **Teacher loop (MR-60):** Minimal teacher reply page, or escalation as a recorded event + roadmap slide?
> 4. **Odia/Hindi reviewer (MR-31):** Who reviews, and by when? — most schedule-sensitive item.

---

## Quick Reference

| Phase | Theme | Key Deliverables | Est. Effort | New MR coverage |
|---|---|---|---|---|
| 1 | **Foundation: Content & Language Data** | Content pack, language packs, schemas, validator | 2–3 hrs | MR-22, MR-30, MR-31, MR-34 |
| 2 | **Offline Core: DB, Tools, Agent Loop** | IndexedDB schema, 12 tools, orchestrator, planner, mastery | 4–6 hrs | MR-04, MR-14, MR-20, MR-21, MR-40, MR-44, MR-50 |
| 3 | **UI: Screens + Gap Viz + Network State** | 11 screens (was 9), gap-viz, study-time input, difficulty tap | 3–5 hrs | MR-10, MR-11, MR-12, MR-13, MR-43, MR-70–72 |
| 4 | **Backend: FastAPI + LLM Proxy + Sync** | 5 endpoints, sync, LLM gateway, SQLite, `seq` field | 2–3 hrs | MR-50, MR-60, MR-91 |
| 5 | **Polish: Trace, Error Handling, Tests** | Trace UI, error bounds, cold-start test, storage budget | 2–3 hrs | MR-41, MR-42, MR-44, MR-80, MR-81, MR-92–94 |
| 6 | **Demo Prep: Seed, README, Backup** | Demo profile, README, API.md, rehearsal checklist | 1–2 hrs | MR-92, MR-93, MR-94 |

---

## Phase 1 — Foundation: Content & Language Data

### Goal
Establish the verified, licensed data layer everything else depends on. No agent or UI code yet.  
**P0 gates:** MR-22 (question bank size), MR-30 (source/licence), MR-31 (language review).

### Files to create
```
content/
  schema/
    pack.schema.json           ← JSON Schema for content packs (updated: adds source, license, reviewed_by, reviewed_on, seq)
    language.schema.json       ← JSON Schema for language packs
  packs/
    class7-science-v1.json     ← Demo pack: Class 7 Science (Photosynthesis + Parts of a Plant)
  languages/
    en.json                    ← English language pack
    hi.json                    ← Hindi language pack
    or.json                    ← Odia language pack
  tools/
    validate_pack.py           ← CLI: validates pack + language pack completeness
  docs/
    AUTHORING_GUIDE.md         ← (MR-34) How to write a topic, misconception, distractor, glossary entry
```

### Content Pack schema additions (MR-30, MR-31, MR-32)
Every pack file must now include:
```json
{
  "pack_id": "class7-science-v1",
  "version": "1.0.0",
  "source": "Original team-authored text",
  "license": "CC-BY-4.0",
  "content_reviewed_by": "Name/role",
  "content_reviewed_on": "2026-09-30",
  "meta": { "class": 7, "board": "BSE-Odisha", "subject": "Science" },
  "languages": {
    "en": { "reviewed_by": "Name", "reviewed_on": "2026-09-30" },
    "hi": { "reviewed_by": "Name", "reviewed_on": "2026-09-30" },
    "or": { "reviewed_by": "Odia-fluent reviewer", "reviewed_on": "2026-09-30" }
  }
}
```

### Content Pack (class7-science-v1.json) must include
- `pack_id`, `version`, `source`, `license`, `content_reviewed_by`, `content_reviewed_on`, `meta`
- **≥ 2 topics:** `photosynthesis` (main demo) + `parts_of_plant` (prerequisite)
- Per topic: `topic_id`, `chapter`, `difficulty`, `prerequisites[]`, `aliases` (en/hi/or)
- Per topic: `concepts[]` → each with `content` {en/hi/or} + `examples` {en/hi/or}
- Per topic: `misconceptions[]` → each with `id`, `description` {en/hi/or}, `remediation_example`
- Per topic: `quiz[]` → **≥ 8 questions** (3 easy, 3 medium, 2 hard); **≥ 2 questions per misconception** (MR-22)
- MCQ options tagged `misconception_id` on distractors
- `glossary[]` → `term_id`, `term`, `gloss` {en/hi/or}, `protected: true/false`

### Language Pack (en/hi/or.json) must include
- `language_code`, `display_name`
- `ui_translations` → `ask_placeholder`, `start_quiz`, `offline`, `syncing`, `reconnecting`, `online`, `next_action`, `mastery`, `correct`, `incorrect`, `outside_pack`, `escalation_saved`, `clear_data`, **`update_ready`** (MR-42), **`storage_low`** (MR-40), **`how_much_time`** (MR-13), **`difficulty_easy`/`difficulty_okay`/`difficulty_hard`** (MR-12)
- `feedback_templates` → `correct`, `incorrect_with_misconception`, `outside_pack`, `teacher_escalation`
- `quiz_templates` → `instruction`
- `example_templates` → `everyday[]`
- `voice_configuration` → `tts`, `stt`, `available`

### Validator (validate_pack.py) — extended (MR-22, MR-30, MR-31, MR-32, MR-33)
- Every topic has all 3 languages in content, examples, misconceptions, quiz stems and options
- Every MCQ option is tagged (correct OR misconception_id)
- Prerequisites exist in the same pack
- Aliases are unique within the pack
- Protected terms appear in every language text for that topic
- **≥ 8 questions per topic; ≥ 2 per misconception** (MR-22 — `exit 1` if not met)
- **`source` and `license` fields present and non-empty** (MR-30 — `exit 1` if absent)
- **All 3 language blocks have `reviewed_by` + `reviewed_on`** (MR-31 — warns with flag `--strict-review`)
- **No topic ID has changed from a prior version without a migration map** (MR-33 — checks `migrations[]` array in pack)

### Authoring Guide (MR-34) — `content/docs/AUTHORING_GUIDE.md`
Short document covering:
1. How to write a concept (plain-language rule + everyday example)
2. How to write a misconception and a distractor option
3. How to write a glossary entry (term + gloss, protected flag)
4. How to run the validator locally
5. Review workflow (content review → language review → merge)

---

## Phase 2 — Offline Core: DB, Tools & Agent Loop

### Goal
The complete agent runs entirely on-device. All 12 tools are real IndexedDB implementations.  
**P0 gates:** MR-04 (clear data per profile), MR-14 (resume), MR-20 (shuffle), MR-40 (storage persistence), MR-44 (cold-start offline).

### Frontend project bootstrap
```bash
cd d:\Nirmt
pnpm create vite@latest frontend -- --template react-ts
cd frontend
pnpm add dexie zustand wouter uuid zod
pnpm add -D vitest @vitest/ui fake-indexeddb @playwright/test
pnpm add -D vite-plugin-pwa workbox-window
```

### Files to create under `frontend/src/`

#### DB layer (`db/`)
- `schema.ts` — Dexie class: stores `profiles`, `student`, `learning_state`, `progress_events`, `quiz_seen`, `content_topics`, `glossary`, `quiz_bank`, `language_packs`, `meta`, `resume_state`
  - **`profiles`** store added for multi-profile support (MR-01): `{profile_id, nickname, avatar, class, language, board, pin_hash?, created_at}`
  - **`quiz_seen`** store for no-repeat tracking (MR-21): `{profile_id, topic_id, question_id, last_seen}`
  - **`resume_state`** store for interrupted-quiz resume (MR-14): `{profile_id, topic_id, step, answers_so_far, timestamp}`
  - `progress_events` gains **`seq`** (monotonic local sequence number) and **`client_timestamp`** fields (MR-50)
  - `progress_events` gains new event types: `baseline_check`, `post_check`, `content_flagged` (MR-80, MR-15)
- `repo.ts` — typed CRUD for all stores; **new exports:**
  - `getProfiles()`, `saveProfile(p)`, `deleteProfile(id)` (MR-01)
  - `saveResumeState(s)`, `getResumeState(profileId, topicId)`, `clearResumeState(...)` (MR-14)
  - `markQuestionSeen(profileId, topicId, questionId)`, `getUnseenQuestions(profileId, topicId, bank)` (MR-21)
  - `appendProgressEvent(e)` — auto-increments `seq` from `meta` store
- `integrity.ts` — boot-time integrity check; rebuild from seed if corrupt; **calls `requestPersistentStorage()`** on first run (MR-40)
- `storage.ts` — **new** (MR-40, MR-41):
  - `requestPersistentStorage()` → calls `navigator.storage.persist()`, stores result in `meta`
  - `getStorageEstimate()` → `navigator.storage.estimate()`
  - `checkStorageBudget()` → warns via Zustand if `usage > quota * 0.8`
  - `pruneOldSyncedEvents(days = 30)` → deletes `synced` events older than N days

#### Content layer (`content/`)
- `loader.ts` — load pack JSON into `content_topics`, `glossary`, `quiz_bank`
- `aliasIndex.ts` — build weighted alias→topic_id map; `matchTopic(input, language)` → `{topic_id, score}`
- `schema.json` — re-exported Zod schema for runtime validation (now includes `source`, `license`, `reviewed_by`)

#### i18n layer (`i18n/`)
- `loader.ts` — load language pack into `language_packs` store
- `render.ts` — `t(key, lang)`, `renderTemplate(template, params)`, `glossaryChip(term, lang)`

#### Agent layer (`agent/`)

**Tools (12 implementations in `tools/`)**

| File | Tool | Offline implementation |
|---|---|---|
| `getStudentProfile.ts` | `get_student_profile` | Read from active `profile` + `student` store |
| `getLearningState.ts` | `get_learning_state` | Read from `learning_state` store; init at mastery=0.3 |
| `retrieveCurriculumContent.ts` | `retrieve_curriculum_content` | Query `content_topics` by class+subject+topic+language |
| `getGlossary.ts` | `get_glossary` | Query `glossary` by term+language |
| `generateExplanation.ts` | `generate_explanation` | Template from content + glossary; online → `/api/llm/rephrase` |
| `generateQuiz.ts` | `generate_quiz` | Select from `quiz_bank` by mastery band; **shuffle options** (MR-20); **exclude seen** (MR-21) |
| `evaluateAnswer.ts` | `evaluate_answer` | MCQ: key match; short-answer: keyword match; **guess detection if < 2 s** (MR-23 P2) |
| `detectMisconception.ts` | `detect_misconception` | Distractor→misconception_id map lookup |
| `updateMastery.ts` | `update_mastery` | EWM formula; **applies confidence modifier from self-report** (MR-12) |
| `selectNextAction.ts` | `select_next_action` | Pure rule table; **receives `available_time` and `self_reported_difficulty`** (MR-12, MR-13) |
| `saveLocalProgress.ts` | `save_local_progress` | Append to `progress_events` with `seq`, `sync_status='pending'`; **saves `resume_state`** (MR-14) |
| `queueSync.ts` | `queue_sync` | Count pending events; trigger sync engine |

**Planner (`planner.ts`)** — extended
- Pure function `selectNextAction(state, result, networkStatus, availableTime?, selfReportedDifficulty?)` → `{action, reason, ruleId}`
- 9 rule conditions as per `02_WORKFLOW.md §3`
- Modifiers: `available_time` (MR-13), `network_status`, **`self_reported_difficulty`** (MR-12)

**Mastery (`mastery.ts`)**
- `computeMastery(current, result, difficulty)` → new score
- `applyMisconductPenalty(mastery)` → mastery − 0.05
- `updateConfidence(history, selfReported?)` → rolling avg of last 5 + optional self-report blend (MR-12)
- `getWeakAreas(state)` → concepts with mastery < 0.5 or active misconceptions
- `detectGuess(answerTimeSec)` → boolean; reduces mastery gain if true (MR-23, P2)

**Nodes (`nodes/`)**

| File | Node | Responsibilities |
|---|---|---|
| `understand.ts` | UNDERSTAND | Normalize → aliasIndex.match → `{intent, topic_id, language, confidence}` |
| `inspectState.ts` | INSPECT_STATE | `get_student_profile` + `get_learning_state`; **check `resume_state`** (MR-14) |
| `plan.ts` | PLAN | `select_next_action(state, null, network, availableTime, difficulty)` |
| `retrieve.ts` | RETRIEVE | `retrieve_curriculum_content` + `get_glossary` |
| `teach.ts` | TEACH | `generate_explanation` |
| `assess.ts` | ASSESS | `generate_quiz` (shuffled, no-repeat) |
| `evaluate.ts` | EVALUATE | `evaluate_answer` + `detect_misconception` |
| `updateState.ts` | UPDATE_STATE | `update_mastery` + `save_local_progress` + `queue_sync`; **clear `resume_state`** on topic complete |
| `actNext.ts` | ACT_NEXT | `select_next_action(updatedState, assessmentResult, network)` |

**Orchestrator (`orchestrator.ts`)**
- `runTurn(ctx: AgentContext): Promise<AgentContext>`
- Checks `resume_state` at boot; if present, restores quiz mid-session (MR-14)
- `withTimeoutAndRetry(node, ctx, {timeoutMs, retries})`
- Writes trace step after each node

**Trace (`trace/`)**
- `model.ts` — `TraceStep`, `TurnTrace` types
- `recorder.ts` — `appendStep`, `summarize`, `toJSON`

**Network Manager (`net/networkManager.ts`)**
- 4-state machine: `ONLINE → OFFLINE → RECONNECTING → SYNCING → ONLINE`
- `/api/health` ping every 10 s (timeout 2 s); debounce 2 failures
- `isLLMAvailable()` with 60 s circuit breaker
- **Detects Data Saver / metered connection; pauses auto-sync** (MR-51 P2)
- Emits state changes; Zustand store

**Sync Engine (`sync/syncEngine.ts`)**
- Load pending events, batch ≤50, `POST /api/sync`
- Mark accepted/duplicates as `synced`; keep rejected with reason
- Exponential backoff: 1 s, 2 s, 4 s; max 3 tries/cycle
- Idempotency: UUID `event_id`
- **Events carry `seq` + `client_timestamp`** (MR-50)
- **Paused automatically on metered connection** (MR-51 P2)

**Profile Manager (`profiles/profileManager.ts`)** — new (MR-01, MR-02, MR-04)
- `listProfiles()` → up to 5 profiles from `profiles` store
- `createProfile(data)`, `switchProfile(id)`, `deleteProfile(id)`
- `clearProfileData(id)` — clears only that profile's `learning_state`, `progress_events`, `resume_state`, `quiz_seen`; leaves other profiles intact (MR-04)
- `clearAllData()` — clears all profiles with confirmation (MR-04)
- PIN support (hash via WebCrypto SHA-256 + random salt) — MR-03, P2

**Storage Monitor (`storage/storageMonitor.ts`)** — new (MR-40, MR-41)
- Calls `navigator.storage.persist()` at first run
- Polls `navigator.storage.estimate()` on launch and after each sync
- Dispatches Zustand `storageWarning` when usage > 80% of quota
- `pruneEvents(30)` — removes synced events older than 30 days

### Tests (Phase 2)
- `__tests__/planner.test.ts` — all 9 rules, each modifier (available_time, self_reported_difficulty)
- `__tests__/mastery.test.ts` — formula accuracy, boundary cases, confidence blend
- `__tests__/aliasIndex.test.ts` — score bands, multilingual
- `__tests__/tools.test.ts` — offline tool calls with fake-indexeddb
- `__tests__/generateQuiz.test.ts` — **shuffle test** (options change order across attempts, MR-20); **no-repeat test** (MR-21); **bank-size test** (MR-22)
- `__tests__/profileManager.test.ts` — create/switch/delete profile; clear one leaves others intact (MR-04)
- `__tests__/storageMonitor.test.ts` — persist request, budget warning at 80% (MR-40)
- `__tests__/resume.test.ts` — mid-quiz kill and restore (MR-14)

---

## Phase 3 — UI: 11 Screens + Network Badge

### Goal
A beautiful, mobile-first React PWA. Large touch targets. All screens wired to the agent.  
**P0 gates:** MR-10 (gap visualization), MR-43 (browser matrix in README), MR-44 (cold-start test in E2E).

### Supported browsers (MR-43)
| Browser | Support level |
|---|---|
| Android Chrome 90+ | **Primary** — full test suite runs here |
| Android System WebView 90+ | **Primary** |
| Desktop Chrome / Edge (demo laptop) | **Primary** |
| iOS Safari 16+ | **Best-effort** — documented limitations: storage eviction, no Background Sync API |
| Firefox (desktop) | **Best-effort** |

### Design system tokens (CSS variables)
- Background: `#0F1117`, surface: `#1A1D2B`, card: `#22253A`
- Primary: `#7C6FFF` (indigo-violet), accent: `#4ECDC4` (teal), warning: `#FFB547`
- Success: `#43D98C`, error: `#FF6B6B`
- Font: `Outfit` (Latin) + Noto Sans Odia + Noto Sans Devanagari (subsetted WOFF2, precached)
- Touch target min-height: **`56px`** (raised from 52 px for MR-11 early-grade mode)
- Text sizes: 3 levels, respects system font scale up to 200% without layout breakage (MR-71)

### Screens (`ui/screens/`)

| Screen | Route | Key components | New MR |
|---|---|---|---|
| `ProfilePickerPage` | `/` | Nickname/avatar cards (≤5), \"Add profile\", 2-tap switch | MR-01, MR-02 |
| `ProfileSetupPage` | `/setup` | Class (1–12), Language, Board, Subjects — large tap chips | — |
| `StudyTimePage` | `/time` | 3 large chips: 5 / 10 / 20 min → sets `available_time` | MR-13 |
| `HomePage` | `/home` | Topic chip grid, search bar, mastery summary strip, network badge, storage warning | MR-40 |
| `AskPage` | `/ask` | Free-text input (300 char; hidden for Class 1-3 MR-11), topic disambiguation chips | MR-11 |
| `ExplanationPage` | `/explain` | Explanation + glossary chips; **difficulty tap** (easy/okay/hard); Report Problem button | MR-12, MR-15 |
| `QuizPage` | `/quiz` | MCQ cards (shuffled), progress dots, **Report Problem** button | MR-20, MR-15 |
| `FeedbackPage` | `/feedback` | Correct/incorrect, misconception label, mastery bar animation, next-action card | — |
| `GapVisualizationPage` | `/gaps` | Concept grid: strong/developing/weak per concept; active misconception named in student's language | **MR-10 P0** |
| `TracePage` | `/trace` | Collapsed summary → timeline → JSON toggle | — |
| `SettingsPage` | `/settings` | Language switcher, text size, **clear data per profile / all**, offline status, version | MR-04, MR-71 |

### Early-grade mode (Class 1–3) — MR-11, P1
- All screens: icon label beside every text label (minimum 24×24 px icon)
- No free-text input on AskPage — replaced by topic chip picker
- Prompts ≤ 12 words
- Voice prompt played automatically if TTS available
- Touch targets: **64 px** minimum height

### Difficulty tap widget — MR-12, P1
Appears after every explanation and quiz result:
```
[ 😊 Easy ]  [ 🤔 Okay ]  [ 😓 Hard ]
```
- Single tap; dismisses automatically after 3 s
- Stored in `progress_events` as `reasoning_category: "self_reported_difficulty"`
- Passed to planner's `self_reported_difficulty` modifier

### Learning-gap visualization — MR-10, P0
`GapVisualizationPage` (`/gaps`):
- Shows each concept in the current topic as a colour-coded chip
- **Strong** (mastery ≥ 0.7): teal filled
- **Developing** (0.4–0.69): amber outline  
- **Weak** (< 0.4): red outline
- Active misconception named in student's language below the chip
- Pre/post delta badge if `baseline_check` and `post_check` events exist (MR-80)
- All states distinguishable in greyscale via icon/text label (MR-72)

### Shared components (`ui/components/`)
- `NetworkBadge` — always-visible corner badge; **icon + text label in addition to colour** (MR-72)
- `MasteryBar` — animated progress bar with label
- `GlossaryChip` — term pill, tap to show local-language definition
- `TopicChip` — topic selector pill
- `AgentSpinner` — "SATHI is thinking..." indicator (ARIA live region MR-70)
- `NextActionCard` — action + reason card, large CTA button
- `TraceTimeline` — trace steps as vertical timeline
- `ErrorBoundary` — catches crashes, shows localized error + retry
- `DifficultyTap` — easy/okay/hard 3-button widget (MR-12)
- `ReportProblem` — flag button; creates `content_flagged` event (MR-15)
- `StorageWarningBanner` — shows when storage > 80% of quota (MR-40)
- `UpdateReadyBanner` — "Update ready" shown only after a session ends, never mid-quiz (MR-42)
- `TextSizeControl` — 3-level font scale; written to `meta` store (MR-71)
- `ProfilePickerCard` — avatar + nickname chip with 2-tap switch (MR-02)

### Accessibility (MR-70, MR-71, MR-72) — P1
- All controls have `aria-label` in current language
- `MasteryBar` and `NetworkBadge` use ARIA live regions (`aria-live="polite"`)
- Text scale respects `prefers-reduced-motion` and system font scaling up to 200%
- All status indicators (mastery bands, network states) have icon + text label alongside colour
- TalkBack can complete onboarding → one topic → one quiz

### State management
- `useAgentStore` (Zustand): current screen, agent context, loading state
- `useNetworkStore` (Zustand): network state, pending sync count
- `useProfileStore` (Zustand): active profile, all profiles, selected language
- `useStorageStore` (Zustand): persist status, usage estimate, warning flag (MR-40)

---

## Phase 4 — Backend: FastAPI + LLM Proxy + Sync

### Goal
Minimal backend enabling LLM rephrasing, cloud sync, and content distribution. App must work 100% if backend is down.

### Project bootstrap
```bash
cd d:\Nirmt
mkdir backend && cd backend
python -m venv .venv
pip install fastapi uvicorn[standard] sqlalchemy alembic pydantic pydantic-settings httpx slowapi python-dotenv
```

### File structure
```
backend/app/
  main.py          ← FastAPI app, CORS, middleware
  config.py        ← pydantic-settings: .env loader
  db.py            ← SQLAlchemy engine + session
  security.py      ← rate limiting, CORS, HSTS headers
  models/
    student.py     ← Student, ProgressEvent (with seq, client_timestamp), LearningStateSnapshot, Escalation
  schemas/
    sync.py        ← SyncRequest, SyncResponse (Pydantic)
    llm.py         ← RephraseRequest, RephraseResponse
    content.py     ← Manifest, Pack metadata
  routers/
    health.py       ← GET /api/health
    sync.py         ← POST /api/sync
    llm.py          ← POST /api/llm/rephrase
    content.py      ← GET /api/content/manifest, GET /api/content/packs/{id}
    escalations.py  ← POST /api/escalations, GET /api/escalations/{id}, PATCH /api/escalations/{id}/reply (MR-60)
  services/
    sync_service.py     ← validate, dedupe (INSERT OR IGNORE), order by seq within device (MR-50), replay mastery
    llm_gateway.py      ← Anthropic API call, output validation, template fallback
    content_service.py  ← read pack files, checksum, manifest
```

### Endpoint contract
- `GET /api/health` → `{status, time, pack_version}`
- `POST /api/sync` → idempotent, max 50 events, 64 KB; **orders by `seq` within `device_id`** (MR-50); returns `{accepted[], duplicates[], rejected[], server_state[]}`
- `POST /api/llm/rephrase` → guarded: topic_id, class, language, source_text, protected_terms, max_words → `{text, validated}`; 422 on validation fail
- `GET /api/content/manifest` → list of `{pack_id, version, size, sha256}`
- `GET /api/content/packs/{pack_id}` → raw JSON download
- `POST /api/escalations` → `{student_id, topic_or_question, language}` → `{escalation_id, status: "waiting"}`
- `GET /api/escalations/{id}` → `{status, reply?, replied_at?}` (MR-61)
- `PATCH /api/escalations/{id}/reply` → `{reply}` (MR-60, teacher page)

### Sync ordering — clock-skew handling (MR-50)
- Client records both `client_timestamp` (ISO) and `seq` (monotonic integer, auto-incremented from `meta` store)
- Server orders events by `(device_id, seq)` within a device session; `client_timestamp` used only for cross-device ordering
- **Replaces** the strict future-timestamp rejection in `05_SECURITY` — events from devices with wrong clocks are accepted and reordered by `seq`

### LLM Gateway output validation (anti-hallucination)
1. All `protected_terms` present
2. All numbers/formulas from source preserved
3. No new entities or numbers
4. Length within class-band limit
5. Script detection (Odia U+0B00–0B7F, Devanagari U+0900–097F)
6. On any failure → 422, client uses template

### API documentation (MR-91, P1)
- `docs/API.md` generated from FastAPI's OpenAPI schema
- Covers every endpoint, schema, error code, and example request/response
- Auto-generated script: `python scripts/gen_api_docs.py` → writes `docs/API.md`

---

## Phase 5 — Polish: Trace, Error Handling, Tests

### Goal
Demo-ready reliability. Cold-start tested. Storage budget verified. README complete.  
**P0 gates:** MR-44 (cold-start E2E), MR-92 (README).

### Decision Trace (UI)
- `TracePage` shows collapsed summary: "5 tools used · Next: give_example · Offline"
- Expandable timeline: each node as a card with icon, tool names, state delta
- "Show technical view" toggle → pretty-printed JSON
- Plain-language version in student's language (from `i18n` templates)

### Error handling
- Every `catch` in tool → `{error: ErrorCode, userMessage: i18nKey}`
- `ErrorBoundary` wraps each screen
- Network loss mid-request → switch to OFFLINE, re-run turn locally
- LLM timeout (6 s) → fall back to template; show "offline-style answer" tag
- Out-of-pack → `teacher_escalation` action + localized message
- **App update available** → `UpdateReadyBanner` shown only after quiz/session end (MR-42)
- **Storage 80% warning** → `StorageWarningBanner` with "Clear old data" action (MR-40)

### Storage budget enforcement (MR-41, P1)
- Total footprint target: **< 25 MB** after a full demo session
- Validated by: DevTools Application → Storage, logged in debug panel
- `pruneEvents(30)` called on every app launch

### Learning-gain instrumentation (MR-80, P1)
- On first entry to a topic: run **3-question baseline check** (difficulty = easy); store as `baseline_check` events
- After the recommended intervention sequence: run same-difficulty **post check**; store as `post_check` events
- `GapVisualizationPage` shows delta badge: "↑ +24% since start"
- Unit-tested in `__tests__/baselineCheck.test.ts`

### Metrics functions (MR-81, P1)
`src/analytics/metrics.ts` — pure functions over event log:
- `misconceptionRecurrenceRate(events, topicId)` → rate
- `nextActionCompletionRate(events)` → rate
- `avgMasteryGainPerTopic(events)` → map of topic → gain
- `sessionsPerWeek(events)` → last 4-week avg

All four unit-tested in `__tests__/metrics.test.ts`.

### Test completion

| Layer | Tests |
|---|---|
| Unit | Planner (9 rules + modifiers), mastery formula, alias matching, template render, LLM validator, shuffle (MR-20), no-repeat (MR-21), bank-size (MR-22), metrics (MR-81), storage monitor (MR-40) |
| Integration | Full turn: question→quiz→wrong→mastery change→next action (offline fixtures); resume after kill (MR-14); profile isolation (MR-04) |
| API | Sync idempotency, seq ordering (MR-50), validation errors, LLM rate limit |
| E2E (Playwright) | **Cold-start offline in < 3 s** (MR-44); scripted demo path with `context.setOffline(true)` toggle; gap-viz screen renders correct bands (MR-10) |

### Debug panel (`?debug=1` + `VITE_DEBUG_PANEL=true`)
- Force offline / Force LLM failure
- Reset profile / Reset all profiles (MR-04)
- Seed demo data (Priya, Class 7, Odia, photosynthesis pre-warmed)
- View raw trace JSON
- View pending sync queue
- **Show storage estimate** (MR-40)
- **Force update banner** (MR-42 test)
- **View baseline vs post-check delta** (MR-80)

---

## Phase 6 — Demo Prep

### Goal
Zero-risk demo. Backup plans in place. All deliverables committed.  
**P0 gates:** MR-92 (README), MR-93 (architecture image), MR-94 (known limitations list).

### Demo seed profile
- `profile_id`: `stu_demo_priya`, nickname: `Priya`, avatar: `🌻`
- Class 7, BSE-Odisha, Language: Odia, Subjects: [Science]
- Pre-cached: photosynthesis + parts_of_plant content
- Mastery initialized at 0.3 for photosynthesis
- `available_time`: 10 min pre-set for demo

### README (MR-92) must include
- Project description + screenshot
- **Architecture diagram as PNG/SVG** (MR-93) — exported from `03_TECHNICAL_ARCHITECTURE.md` Mermaid
- Setup instructions (content validation → backend → frontend)
- `.env.example` explanation
- Offline test instructions (Chrome DevTools → Application → SW → Offline)
- Browser support matrix (MR-43)
- **Known limitations** (MR-94): Odia voice, iOS storage eviction, single-subject pack, 5 profile limit, guess detection deferred
- `docs/API.md` link

### Known-limitations list (MR-94, to be kept current)
1. Odia voice (TTS/STT): browser support is limited; text fallback always active
2. iOS Safari: IndexedDB may be evicted; Background Sync API absent; data loss risk noted
3. Single subject: demo pack covers Science only
4. Profile limit: 5 profiles per device
5. Guess detection (MR-23): deferred to P2; mastery can be gamed by fast tapping
6. Parent summary (MR-62): deferred to P2; local-only render planned
7. Data transfer / export (MR-52): deferred to P2

### Demo rehearsal checklist
- [ ] Deploy 24 h early
- [ ] Install PWA on demo phone (Android Chrome)
- [ ] Pre-warm: open app online (SW + packs cached)
- [ ] **Cold-start test**: close browser → airplane mode → open PWA → Home renders in < 3 s (MR-44)
- [ ] Airplane-mode test: full topic loop still works
- [ ] Reconnect test: syncing badge appears, sync completes, seq ordering correct
- [ ] Gap visualization: shows correct strong/developing/weak bands
- [ ] Trace: all 7+ steps visible, tool names correct
- [ ] Storage estimate < 25 MB in debug panel (MR-41)
- [ ] Backup: screen-recorded video of the full 4-min flow

---

## Key Architecture Constraints (from docs)

> [!IMPORTANT]
> - **Agent runs on-device.** The backend is optional at runtime. Going offline must not kill the agent.
> - **12 tools are all real.** No mock/stub tools in the demo. Every tool in a turn is logged in the trace.
> - **Planner is a pure function.** Never use the LLM to decide pedagogy or the next action.
> - **Content is grounded.** LLM only rephrases; it never decides correctness or adds facts.
> - **Offline is normal mode.** The UI must show OFFLINE state clearly; learning continues uninterrupted.
> - **Language is data, not code.** No language string in business logic; everything through i18n packs.
> - **Content must be licensed.** No pack without `source` + `license`; validator enforces this.
> - **Language text must be reviewed.** Odia and Hindi require human sign-off before demo.
> - **Storage is not guaranteed.** Call `navigator.storage.persist()` at first run; warn at 80% quota.
> - **Profiles are isolated.** Clearing one profile must not touch any other profile's data.

---

## Missing Requirements Coverage Map

| MR-ID | Description | Phase | Priority | Status |
|---|---|---|---|---|
| MR-01 | Multiple profiles (≤5) per device | 2 + 3 | P1 | 📋 Planned |
| MR-02 | Profile picker with nickname/avatar | 3 | P1 | 📋 Planned |
| MR-03 | Optional 4-digit PIN (salted hash) | 2 | P2 | 📋 Deferred |
| MR-04 | Clear data per profile + all profiles | 2 + 3 | **P0** | 📋 Planned |
| MR-10 | Learning-gap visualization screen | 3 | **P0** | 📋 Planned |
| MR-11 | Early-grade mode (Class 1–3) | 3 | P1 | 📋 Planned |
| MR-12 | Self-reported difficulty tap | 2 + 3 | P1 | 📋 Planned |
| MR-13 | Study-time input → planner | 2 + 3 | P1 | 📋 Planned |
| MR-14 | Resume interrupted quiz | 2 | **P0** | 📋 Planned |
| MR-15 | Report a problem button | 2 + 3 | P1 | 📋 Planned |
| MR-20 | Shuffle answer options | 2 | **P0** | 📋 Planned |
| MR-21 | No immediate question repeats | 2 | P1 | 📋 Planned |
| MR-22 | Minimum question bank (≥8, ≥2 per misconception) | 1 | **P0** | 📋 Planned |
| MR-23 | Guess detection (< 2 s) | 2 | P2 | 📋 Deferred |
| MR-30 | Source + licence in every pack | 1 | **P0** | 📋 Planned |
| MR-31 | Language review gate (Odia/Hindi) | 1 | **P0** | 📋 Planned |
| MR-32 | Subject accuracy review | 1 | P1 | 📋 Planned |
| MR-33 | Stable IDs + migration map | 1 | P1 | 📋 Planned |
| MR-34 | Authoring guide | 1 | P1 | 📋 Planned |
| MR-40 | `navigator.storage.persist()` + 80% warning | 2 + 3 | **P0** | 📋 Planned |
| MR-41 | Storage budget < 25 MB; prune after 30 days | 2 + 5 | P1 | 📋 Planned |
| MR-42 | Update flow: never mid-quiz | 3 | P1 | 📋 Planned |
| MR-43 | Browser support matrix | 3 + 6 | **P0** | 📋 Planned |
| MR-44 | Cold-start offline in < 3 s | 5 | **P0** | 📋 Planned |
| MR-45 | Low-data budget < 100 KB/session | 5 | P1 | 📋 Planned |
| MR-50 | Clock-skew: `seq` + `client_timestamp` | 2 + 4 | P1 | 📋 Planned |
| MR-51 | Sync paused on Data Saver | 2 | P2 | 📋 Deferred |
| MR-52 | Profile export/import (backup + transfer) | — | P2 | 📋 Deferred |
| MR-60 | Teacher escalation reply path | 4 | P1 | 📋 Planned |
| MR-61 | Escalation status shown to student | 3 | P1 | 📋 Planned |
| MR-62 | Parent summary screen | — | P2 | 📋 Deferred |
| MR-70 | Screen-reader support (TalkBack) | 3 | P1 | 📋 Planned |
| MR-71 | Text-size control + 200% system scale | 3 | P1 | 📋 Planned |
| MR-72 | Colour-independent status (icon + text) | 3 | P1 | 📋 Planned |
| MR-80 | Baseline + post-check instrumentation | 5 | P1 | 📋 Planned |
| MR-81 | 4 metrics functions over event log | 5 | P1 | 📋 Planned |
| MR-82 | Pilot evaluation plan document | — | P2 | 📋 Deferred |
| MR-91 | `API.md` generated from OpenAPI | 4 | P1 | 📋 Planned |
| MR-92 | README (full setup guide) | 6 | **P0** | 📋 Planned |
| MR-93 | Architecture diagram as PNG/SVG | 6 | P1 | 📋 Planned |
| MR-94 | Known-limitations list | 6 | P1 | 📋 Planned |

---

## File Count Summary (updated)

| Area | Approximate files |
|---|---|
| Content packs + schemas + authoring guide | ~10 |
| Frontend source (agent, tools, nodes, storage, profiles) | ~42 |
| Frontend UI (screens, components) | ~25 |
| Backend (routers, services, models) | ~18 |
| Tests | ~15 |
| Config / tooling / docs | ~10 |
| **Total** | **~120** |
