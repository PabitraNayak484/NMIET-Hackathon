# SATHI: Product Requirements Document (PRD)

**SATHI: Smart AI Teaching and Helpful Intelligence**
Offline-first multilingual AI learning companion for Classes 1-12
Version 1.0 (Hackathon MVP)

---

## 1. Vision and Principle

SATHI is **not a chatbot**. It is an educational agent that **understands, remembers, decides, teaches, assesses and acts**.

> **Judge story:** One learner, one learning gap, one language barrier, one unreliable network, and an AI agent that takes the next useful action.

**Hackathon priority:** a working agentic MVP over feature quantity. Every feature must support at least one of: problem clarity, agentic technical depth, demo reliability, multilingual access, or offline learning. Anything else is cut.

---

## 2. Problem Statement

Students in India, especially in rural, semi-urban and low-connectivity areas, face learning gaps caused by:

| Barrier | Concrete effect |
|---|---|
| Language | Student learns in Odia/Hindi but meets English technical terms |
| Device | Shared or low-end smartphone, limited storage and RAM |
| Connectivity | Slow, unreliable or absent internet |
| Shallow learning | Student knows the answer mechanically, not the concept |
| Teacher bandwidth | No one diagnoses each student's individual misconception |
| Direction | Student does not know what to revise next after a mistake |

**Gap SATHI closes:** adapts explanation, terminology, examples, difficulty and interaction style to the learner's language (not mere translation), works fully offline, and decides the next learning step from learner state.

---

## 3. Target Users

**Primary persona: Priya, Class 7, Odisha**
- Studies in Odia medium; science terms appear in English.
- Uses her parent's low-end Android phone, in the evening.
- Internet drops frequently.
- Can recite "plants make food using sunlight" but believes plants take food from soil.

**Secondary:** teachers (future escalation queue), parents (future summary). Both are **out of MVP UI**; only the escalation *event* is recorded.

---

## 4. Goals and Non-Goals

### Goals (MVP)
1. Student profile with class (1-12), language, board, subjects, preferences.
2. Language-specific teaching, quizzing and feedback (English, Odia, Hindi minimum).
3. A real agent loop with real tool calls and real state changes.
4. Learner state: mastery, attempts, misconceptions, confidence.
5. Adaptive next-action planner.
6. Offline-first: cached content, local quiz, local progress, sync queue.
7. Human-readable decision trace.
8. Lightweight, large-button, mobile-first UI.

### Non-Goals (do not build now)
School ERP, teacher management suite, parent portal, payments, ads, social features, leaderboards, huge content library, video streaming, complex gamification, microservices, heavy authentication, advanced analytics.

---

## 5. Functional Requirements

### 5.1 Priority P0 (must ship)

| ID | Feature | Requirements |
|---|---|---|
| F1 | Student profile | Local anonymous ID; class 1-12; language; board; subjects; learning preferences (e.g. more examples, shorter text) |
| F2 | Language-specific learning | Ask and answer in selected language; keep academic terms (with glossary gloss); class-appropriate vocabulary; local-context examples; language-aware quiz and feedback |
| F3 | Educational agent | Detect intent and topic; inspect learner state; retrieve trusted content; choose action; teach; assess; update state; choose follow-up |
| F4 | Tool calling | All 12 tools in Section 8 are implemented and invoked for real |
| F5 | Learner state | Current topic, mastery, attempt history, weak concepts, recent mistakes, confidence, last recommended action |
| F6 | Adaptive planner | Chooses among: explain, give_example, revise_prerequisite, practice, quiz, review, continue, teacher_escalation |
| F7 | Assessment | 2-3 short questions; evaluate; identify likely misconception; update mastery; recommend next action |
| F8 | Offline learning | Local content cache, profile, progress, quiz, history; queued sync |
| F9 | Decision trace | Detected topic, relevant state, tools called, reason for next action, online/offline status; **no raw chain-of-thought** |
| F10 | Simple UI | Large buttons, minimal typing, language/class/subject selectors, ask box, answer area, mastery indicator, offline indicator |

### 5.2 Priority P1 (only if P0 is stable)
Voice input, text-to-speech, image question input, teacher escalation queue view, parent progress summary.

### 5.3 Priority P2 (explicitly deferred)
Gamification, leaderboards, social, advanced analytics, payments, ads, video library, school management.

---

## 6. User Stories and Acceptance Criteria

| # | Story | Acceptance |
|---|---|---|
| US1 | As a student, I choose my class and language so lessons fit me | Class 1-12 and 3 languages selectable; UI text switches language; changing language keeps learner state |
| US2 | As a student, I ask a question in my language and get an explanation I understand | Answer in chosen language, grounded in content pack, key terms shown with English term and local gloss |
| US3 | As a student, I take a short quiz on what I just learned | 2-3 questions generated in my language, answers evaluated |
| US4 | As a student, I get told *why* I was wrong | Misconception detected and named in plain language |
| US5 | As a student, I am told what to do next | Next action chosen from updated state, with a one-line reason |
| US6 | As a student on a bad network, I keep learning | Airplane mode: ask, learn, quiz, progress all still work |
| US7 | As a student, my progress is not lost | Offline events queue locally and sync once, with no duplicates, after reconnect |
| US8 | As a judge or teacher, I see how the agent decided | Decision trace shows steps, tools, state, reason |
| US9 | As a student, I ask something outside the pack | System says it is outside verified content and offers teacher escalation; it does not fabricate |
| US10 | As a guardian, I can clear a child's data | "Clear local data" button wipes local DB |

### Global Acceptance Criteria (from brief)
- Class 1-12 and language selectable.
- Agent reads learner state **before** deciding the next action.
- At least **5 meaningful tools** actually called in one learning journey (target: all 12).
- Learner state changes after assessment; the next action is derived from the updated state.
- Core flow works without internet; offline progress stored locally and synced after reconnect.
- Online / Offline / Reconnecting / Syncing states clearly displayed.
- Trace shows the sequence of meaningful actions.
- Content grounded in verified pack.
- Runs smoothly on a low-end phone; stable for a 3-4 minute live demo.

---

## 7. Language Requirements

- **Language-pack architecture**; no language text hard-coded in business logic.
- Pack fields: `language_code`, `display_name`, `ui_translations`, `academic_glossary`, `prompt_templates`, `example_templates`, `feedback_templates`, `quiz_templates`, `voice_configuration`.
- Rules:
  - Never assume English is the primary language.
  - Preserve math, science symbols and units (H2O, CO2, +, x, =).
  - Keep technical terms with a gloss, e.g. "photosynthesis (ଆଲୋକ ସଂଶ୍ଳେଷଣ)".
  - Age-appropriate register by class band (1-3, 4-5, 6-8, 9-10, 11-12).
  - Avoid machine-translation-only output; use curated glossary and templates first.
  - Language switch mid-session keeps learner state.
  - **Fallback:** if a feature is unavailable in a language (e.g. voice), fall back to text and show a visible notice.

---

## 8. Agent Tools (required)

| Tool | Input | Output |
|---|---|---|
| `get_student_profile` | student_id | class, board, language, subjects, preferences |
| `get_learning_state` | student_id, topic | mastery, attempts, misconceptions, confidence, weak_areas |
| `retrieve_curriculum_content` | class, subject, topic, language | verified content + prerequisites |
| `get_glossary` | concept, language, class | term + language-specific explanation |
| `generate_explanation` | content, class, language, learning_level | age-appropriate explanation |
| `generate_quiz` | topic, class, language, mastery | 2-3 questions with answer metadata |
| `evaluate_answer` | question, expected_answer, student_answer, language | correctness, confidence, reasoning category |
| `detect_misconception` | question, expected_answer, student_answer, topic | misconception category or null |
| `update_mastery` | student_id, topic, assessment_result | new mastery + updated weak areas |
| `select_next_action` | learner_state, assessment_result, network_status | next action + short reason |
| `save_local_progress` | student_id, progress_event | local_save_status |
| `queue_sync` | unsynced_events | sync_queue_status |

---

## 9. Content Requirements

- **Verified content pack (JSON)** with metadata: class, board, subject, chapter, topic, concept, language, difficulty, prerequisites, source.
- **MVP demo pack:** 1-2 subjects, about 3-5 topics each, in English + Odia + Hindi. Suggested demo topic: **Class 7 Science, Photosynthesis** (prerequisite: "Parts of a plant"), because it has a classic, detectable misconception (plants absorb food from soil).
- Architecture must let new classes and subjects be added by adding JSON only, with no agent code changes.
- **Answer policy:** ground in retrieved content; do not invent textbook facts; use confidence thresholds; escalate uncertain questions.

---

## 10. Offline-First Requirements

- Offline is a **normal mode**, not an error.
- Modes: `ONLINE`, `OFFLINE`, `RECONNECTING`, `SYNCING` (always visible).
- Stored locally: profile, language, class, curriculum cache, glossary cache, quiz cache, history, mastery state, pending sync events.
- Demo requirement: disable network live; the ask, teach, quiz, mastery, next-action loop continues.
- On reconnect: validate queue, sync, resolve conflicts safely, mark synced, and never interrupt the user.

---

## 11. UI Requirements

**Screens (9):** Welcome/Profile setup; Class and language selection; Home/Learning dashboard; Ask SATHI; Learning explanation; Mini quiz; Progress/mastery; Agent decision trace; Offline/sync status.

**Principles:** simple, fast, low-data, mobile-first, accessible, large touch targets, minimal typing (prefer topic chips and multiple-choice), Unicode fonts for Odia and Devanagari, always-visible network badge.

**Avoid:** complex dashboards, heavy animation, video backgrounds, deep navigation, login flows.

---

## 12. Non-Functional Requirements

| Area | Target |
|---|---|
| Performance | Offline agent turn under 300 ms; online LLM turn under 6 s with timeout and fallback |
| Footprint | Initial PWA payload under 1.5 MB (excluding content pack); content pack under 5 MB for MVP |
| Device | Works on Android with 2 GB RAM, Chrome 90+ |
| Reliability | No crash on API failure, network loss or bad input |
| Accessibility | Min 48 px touch targets, contrast AA, readable fonts, language-appropriate line height |
| Privacy | Anonymous ID, minimal data, clear-data control (see 05_SECURITY.md) |

---

## 13. Success Metrics

**Technical:** end-to-end loop completes; offline flow works; sync succeeds with no duplicates; learner state changes after assessment; next action derived from state.

**Learning:** mastery increases after intervention; repeated-misconception rate drops; recommended next activity is completed.

**Demo:** full journey within 4 minutes; offline section has no internet dependency; tool calls and state changes visible and real.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LLM hallucination | Retrieval-grounded prompts; template fallback; confidence threshold; escalation |
| Poor Odia/Hindi quality from LLM | Curated glossary + template-first responses; LLM only rephrases within constraints; human-reviewed pack for demo |
| Live network failure during demo | Offline-first design means failure is the demo; pre-warmed cache; recorded backup video |
| Scope creep | Strict scope control list (Section 4) |
| Sync duplicates or conflicts | Idempotent event IDs, append-only events, server-side dedupe |
| Low-end device slowness | Vanilla-lean PWA, small bundle, lazy loading, no heavy assets |
| Content pack too small for judges' questions | Clear "outside pack" response and teacher escalation |

---

## 15. Milestones (hackathon timeline suggestion)

| Phase | Deliverable |
|---|---|
| 1 | Content pack + language packs + schemas |
| 2 | Local DB, tools, agent state machine (offline core) |
| 3 | UI screens and network state machine |
| 4 | Backend: LLM proxy, sync endpoint |
| 5 | Decision trace, error handling, polish |
| 6 | Demo rehearsal, README, pitch deck, backup video |

---

## 16. Deliverables

Runnable app (frontend + backend), agent workflow, 12 tool implementations, local database, offline mode, sync mechanism, seed content, language packs, README, architecture diagram, API docs, demo script, pitch deck content, setup instructions, `.env.example`, DB schema, sample data, offline test instructions, known limitations.
