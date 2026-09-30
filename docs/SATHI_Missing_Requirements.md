# SATHI: Missing Requirements (Gap Analysis)

**Purpose:** list the requirements that are **not present** in the five docs (`01_PRD`, `02_WORKFLOW`, `03_TECHNICAL_ARCHITECTURE`, `04_TECH_STACK`, `05_SECURITY`), and state each one precisely enough to build and test.

**Method:** I compared the five docs against (a) the original project brief and (b) what a real low-connectivity school deployment needs. Every candidate was searched for in the docs. Anything found, even partially, is marked "partial" and is not counted as missing. I also checked the 3-file set (`SATHI_Requirements`, `SATHI_System_Architecture`, `SATHI_Implementation_Plan`); none of the requirements below are in it either, so they are missing everywhere.

**ID scheme:** `MR-xx`. Priority: **P0** = needed for the demo or for reliability, **P1** = after all P0 gates pass, **P2** = post-hackathon.

---

## 1. Coverage Check Against the Original Brief

| Brief item                                                     | Status in the 5 docs     | Note                                                                     |
| -------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| Student profile, class, language, board, subjects, preferences | Covered                  |                                                                          |
| Language-pack architecture, glossary, fallback                 | Covered                  |                                                                          |
| Agent loop, 12 tools, planner, learner state                   | Covered                  |                                                                          |
| Assessment and misconception detection                         | Covered                  |                                                                          |
| Offline cache, local progress, sync queue, reconnect           | Covered                  |                                                                          |
| Decision trace without raw chain-of-thought                    | Covered                  |                                                                          |
| Security and privacy minimums                                  | Covered                  |                                                                          |
| Demo script (3-4 min)                                          | Covered                  |                                                                          |
| **Learning-gap visualization** (listed as demo evidence) | **Missing**        | No screen or requirement defines it                                      |
| **Confidence or difficulty indicator** from the learner  | **Partial**        | Confidence is computed from correctness only; the student is never asked |
| **`available_study_time` as a decision input**         | **Partial**        | Planner modifier exists, but nothing captures the value                  |
| **Measure learning improvement**                         | **Partial**        | One Q&A line; no method, baseline or instrumentation                     |
|                                                                |                          |                                                                          |
| **API documentation, README**                            | **Partial**        | Listed as deliverables; only endpoint examples exist                     |
| Teacher escalation queue                                       | **Partial**        | Write-only: events are recorded, nobody can answer them                  |
| Parent progress summary, image input                           | Partial (P1, named only) | No behaviour defined                                                     |

---

## 2. Missing Requirements

### 2.1 Profiles and shared devices

The brief says students may use **a shared or low-end smartphone**. The docs assume **one local profile per device**.

| ID    | Requirement                                                                                                                                                  | Why it is a gap                                                             | Acceptance test                                                                    | Pri |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --- |
| MR-01 | The app supports**multiple local student profiles** on one device (up to 5), each with its own class, language, state and event log                    | Siblings or classmates sharing a phone would overwrite each other's mastery | Create 2 profiles; progress in A does not change B; switching takes at most 2 taps | P1  |
| MR-02 | A**profile picker** appears at launch when more than one profile exists; it uses a name or avatar chosen by the student, never a real-name requirement | Needed for MR-01 without collecting identifiers                             | Picker shows chosen nicknames/avatars only                                         | P1  |
| MR-03 | Optional**4-digit PIN** per profile, stored as a salted hash                                                                                           | `05_SECURITY` lists a PIN as a mitigation but no requirement defines it   | Wrong PIN 5 times triggers a 30 s lock; PIN never stored in clear                  | P2  |
| MR-04 | **Clear data** works per profile and for all profiles, with a confirmation step                                                                        | Current text covers one profile                                             | Clearing one profile leaves others intact                                          | P0  |

### 2.2 Learner experience

| ID    | Requirement                                                                                                                                                                                 | Why it is a gap                                                                 | Acceptance test                                                                                            | Pri          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| MR-10 | **Learning-gap visualization**: a progress screen showing each concept in the topic as strong / developing / weak, with the active misconception named in the student's language      | The brief lists it as demo evidence; no doc defines it                          | After the demo quiz the screen marks "Plants make their own food" as weak and names the soil misconception | **P0** |
| MR-11 | **Early-grade mode for Classes 1-3**: icon-first navigation, a minimum 56 px touch target, short prompts (under 12 words), and audio prompts where a voice exists; no free-text input | Docs vary only vocabulary by class band; non-readers cannot use a text-first UI | For Class 1-3 profiles, every screen has an icon label, and no screen requires typing                      | P1           |
| MR-12 | **Self-reported difficulty**: after each explanation and quiz, one tap (easy / okay / hard) that feeds `confidence` and the planner                                                 | Brief lists "confidence or difficulty indicator"; today it is inferred only     | Choosing "hard" lowers the confidence used by the planner and is stored in the event                       | P1           |
| MR-13 | **Study-time input**: Home screen asks "How much time do you have?" (5 / 10 / 20 min) and passes it to the planner as `available_time`                                              | Planner uses it, but no input exists                                            | With 5 min selected, the planner prefers`quiz` or `review` over a long `explain`                     | P1           |
| MR-14 | **Resume**: an interrupted quiz or explanation resumes at the same step after app close, reload or network loss                                                                       | A phone call or app switch on a shared phone is common                          | Kill the tab mid-quiz; reopening returns to the same question with prior answers kept                      | P0           |
| MR-15 | **Report a problem** button on every explanation and question, storing a local flag (and syncing it)                                                                                  | The only guard against wrong or badly translated content after release          | Flagging creates an event with`content_id`, language and optional reason; it appears in the sync queue   | P1           |

### 2.3 Assessment integrity

| ID    | Requirement                                                                                                                                                                      | Why it is a gap                                                                  | Acceptance test                                                                                   | Pri          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| MR-20 | **Shuffle** answer options per attempt while keeping option IDs stable                                                                                                     | A fixed position lets students memorise "option B"                               | Two attempts of the same question show a different order; scoring unchanged                       | P0           |
| MR-21 | **No immediate repeats**: a question is not reshown within the same topic until the bank is exhausted, unless it targets an active misconception                           | Retests of the same item inflate mastery                                         | Across 6 quizzes, no question repeats before all others are used                                  | P1           |
| MR-22 | **Minimum bank size**: at least 8 questions per topic (3 easy, 3 medium, 2 hard) and at least 2 questions per listed misconception                                         | Planner and rule 5 (repeated misconception) cannot work with a bank of 3         | Pack validator fails if the minimums are not met                                                  | **P0** |
| MR-23 | **Guess detection**: if a student answers in under 2 seconds on 3 consecutive questions, reduce the mastery gain for those answers and mark `reasoning_category = guess` | The brief lists "reasoning category" but nothing defines how guessing is handled | Three sub-2-second answers produce a smaller mastery change than the same answers at normal speed | P2           |

### 2.4 Content governance

| ID    | Requirement                                                                                                                                                                                                                         | Why it is a gap                                                                                                        | Acceptance test                                                                                                   | Pri          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| MR-30 | **Source and licensing record**: every pack states the source, licence and permission status. For the hackathon, all content is **original, team-authored**, or used under a documented licence                         | Docs say "NCERT (adapted)" without addressing copyright; textbook text cannot be copied into a pack without permission | `source` and `license` fields are mandatory in the pack schema; validator rejects a pack without them         | **P0** |
| MR-31 | **Language review gate**: Odia and Hindi text must be reviewed and signed off by a fluent reviewer; the pack records `reviewed_by` and `reviewed_on` per language                                                         | Machine translation quality is the highest demo risk                                                                   | The validator flags any language block without review metadata; the demo build requires none flagged              | **P0** |
| MR-32 | **Subject accuracy review**: a teacher or subject expert signs off each topic's content and misconception map                                                                                                                 | Wrong textbook facts would undermine the "verified content" claim                                                      | `reviewed_by` and `reviewed_on` present for content as well as language                                       | P1           |
| MR-33 | **Stable IDs and pack migration**: topic, concept, question and misconception IDs never change between versions; removed items are marked deprecated, not deleted. When a pack updates, local learner state is migrated by ID | Docs version packs but do not protect existing learner state if an ID is renamed                                       | Updating a pack that renames a concept without a migration map fails validation; with a map, mastery is preserved | P1           |
| MR-34 | **Authoring guide**: a short document telling contributors how to write a topic, misconception, distractor and glossary entry                                                                                                 | Needed to scale content beyond the team                                                                                | Guide exists in`docs/` and a new contributor can add a topic that passes the validator                          | P1           |

### 2.5 Offline and PWA robustness

| ID    | Requirement                                                                                                                                                                                                                            | Why it is a gap                                                                                  | Acceptance test                                                                                      | Pri          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------ |
| MR-40 | **Persistent storage**: request `navigator.storage.persist()` at first run and read `navigator.storage.estimate()`; warn when usage exceeds 80% of quota                                                                     | Browsers can evict IndexedDB on low-storage phones, which would silently delete offline progress | After install, persistence status is shown in the debug panel; a simulated 80% quota shows a warning | **P0** |
| MR-41 | **Storage budget**: total local footprint (packs, fonts, events) stays under 25 MB for the MVP; old synced events are pruned after 30 days                                                                                       | Shared low-end phones have little space                                                          | Storage estimate after a full demo session is under 25 MB                                            | P1           |
| MR-42 | **Update flow**: when a new app version is available, show "Update ready" and apply it only between sessions, never mid-quiz                                                                                                     | A service-worker update during a quiz could reset the screen                                     | Deploy a new build during a quiz; the quiz continues; the update applies after it ends               | P1           |
| MR-43 | **Browser support matrix**: Android Chrome 90+ and Android System WebView are supported; desktop Chrome and Edge for the demo laptop; iOS Safari is best-effort and documented as limited (storage eviction, no background sync) | No browser list exists                                                                           | README lists supported browsers; the E2E suite runs on Chromium                                      | **P0** |
| MR-44 | **Cold-start offline**: after one online session, the app launches from a fully closed state in airplane mode in under 3 s                                                                                                       | Docs require offline use but not a cold-start test                                               | Close the browser, enable airplane mode, open the installed PWA; Home renders                        | **P0** |
| MR-45 | **Low-data budget**: a session of 10 minutes online uses under 100 KB of network traffic after first install (LLM calls excluded and capped at 5 KB each)                                                                        | Data cost matters to target users                                                                | Network panel during the demo path shows the budget is met                                           | P1           |

### 2.6 Sync and time

| ID    | Requirement                                                                                                                                                                                                 | Why it is a gap                                                                                                                           | Acceptance test                                                                  | Pri |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- |
| MR-50 | **Clock-skew handling**: the client records both `client_timestamp` and a monotonic local sequence number; the server orders by sequence within a device and uses the timestamp only across devices | Low-end phones often have wrong dates;`05_SECURITY` rejects far-future timestamps, which would wrongly reject events from a wrong clock | A device with its clock 3 days ahead still syncs all events in the correct order | P1  |
| MR-51 | **Sync fairness**: sync is paused when the device reports Data Saver or a metered connection, unless the student taps "Sync now"                                                                      | Protects limited data plans                                                                                                               | With Data Saver on, no automatic sync occurs; manual sync works                  | P2  |
| MR-52 | **Progress backup and transfer**: export the profile and event log as a small file or short code, and import it on another device                                                                     | Phone loss or replacement currently loses all unsynced progress                                                                           | Export on device A, import on device B; mastery matches                          | P2  |

### 2.7 Teacher and parent loop

| ID    | Requirement                                                                                                                                                                                               | Why it is a gap                                                                  | Acceptance test                                                                             | Pri |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --- |
| MR-60 | **Escalation response path**: a teacher can view open escalations, see the student's topic, misconception and recent mistakes, and attach a short reply; the reply reaches the student on next sync | Today escalation is write-only, so the "teacher escalation" action leads nowhere | Create an escalation; add a reply on a minimal teacher page; the student sees it after sync | P1  |
| MR-61 | **Escalation status** shown to the student (sent, waiting, answered)                                                                                                                                | Students otherwise do not know if anyone saw their question                      | Status changes from waiting to answered after MR-60                                         | P1  |
| MR-62 | **Parent summary content**: a one-screen summary: topics studied, mastery per topic, top misconception, suggested next step, in the parent's chosen language                                        | The docs list it as P1 but define no content                                     | Summary renders from local data only and needs no network                                   | P2  |

### 2.8 Accessibility

| ID    | Requirement                                                                                                                                                                     | Why it is a gap                                        | Acceptance test                                                     | Pri |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | --- |
| MR-70 | **Screen-reader support**: all controls have accessible names in the current language; mastery and network status are announced (ARIA live regions); tested with TalkBack | Docs cover only contrast and target size               | TalkBack can complete onboarding, one topic and one quiz            | P1  |
| MR-71 | **Text-size control** (3 levels) and support for system font scaling up to 200% without layout breakage                                                                   | Low-end screens and low vision                         | At 200% scaling, no text is clipped on the quiz screen              | P1  |
| MR-72 | **Colour-independent status**: mastery and network states use an icon or text label in addition to colour                                                                 | Red/green or amber/blue alone fails colour-blind users | Screenshot in greyscale still distinguishes all four network states | P1  |

### 2.9 Measurement and evaluation

| ID    | Requirement                                                                                                                                                                                                                  | Why it is a gap                                                             | Acceptance test                                                                              | Pri |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --- |
| MR-80 | **Learning-gain instrumentation**: record a 3-question **baseline check** on first entry to a topic and the same-difficulty **post check** after the recommended intervention; store both in the event log | The docs say "pre/post mastery deltas" but nothing creates a clean baseline | Events`baseline_check` and `post_check` exist and the progress screen can show the delta | P1  |
| MR-81 | **Metrics definition**: define and compute locally: misconception recurrence rate, next-action completion rate, average mastery gain per topic, sessions per week                                                      | Success metrics are listed but not specified                                | A metrics function returns all four from the event log; unit-tested                          | P1  |
| MR-82 | **Pilot evaluation plan**: a short document defining sample size, duration, baseline, comparison and consent for a real classroom pilot                                                                                | Needed to answer "how do you measure learning improvement" beyond the demo  | Document exists and is referenced in the pitch deck                                          | P2  |

### 2.10 Deliverables not yet produced

| ID    | Requirement                                                                                                                    | Why it is a gap                                     | Acceptance test                                                       | Pri          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------- | ------------ |
|       |                                                                                                                                |                                                     |                                                                       |              |
| MR-91 | **API documentation file** (`API.md`) generated from the FastAPI OpenAPI schema, with example requests and error codes | Only examples in`03_TECHNICAL_ARCHITECTURE` exist | `API.md` lists every endpoint, schema and error code                | P1           |
| MR-92 | **README** covering setup, environment variables, run steps, offline test, demo steps and known limitations              | Listed as a deliverable, no content defined         | A new teammate runs the app from the README alone in under 15 minutes | **P0** |
| MR-93 | **Architecture diagram as an image** (PNG/SVG export of the Mermaid diagrams) for the deck                               | Diagrams exist only as Mermaid text                 | PNG/SVG files committed and used in the deck                          | P1           |
| MR-94 | **Known-limitations list** kept current (for example: Odia voice, iOS limits, pack size, single subject)                 | Brief requires it; none exists                      | List exists and is shown in the README                                | P1           |

---

## 3. Summary

| Area                        | Missing requirements |           P0 |           P1 |          P2 |
| --------------------------- | -------------------: | -----------: | -----------: | ----------: |
| Profiles and shared devices |                    4 |            1 |            2 |           1 |
| Learner experience          |                    6 |            2 |            4 |           0 |
| Assessment integrity        |                    4 |            2 |            1 |           1 |
| Content governance          |                    5 |            2 |            3 |           0 |
| Offline and PWA robustness  |                    6 |            3 |            3 |           0 |
| Sync and time               |                    3 |            0 |            1 |           2 |
| Teacher and parent loop     |                    3 |            0 |            2 |           1 |
| Accessibility               |                    3 |            0 |            3 |           0 |
| Measurement                 |                    3 |            0 |            2 |           1 |
| Deliverables                |                    5 |            2 |            3 |           0 |
| **Total**             |         **42** | **12** | **24** | **6** |

### The P0 set (do these even in the short version)

| ID    | Item                                      | Why it matters for the demo              |
| ----- | ----------------------------------------- | ---------------------------------------- |
| MR-04 | Clear data per profile                    | Privacy claim must be demonstrable       |
| MR-10 | Learning-gap visualization                | Named in the brief as demo evidence      |
| MR-14 | Resume interrupted quiz                   | Live demos get interrupted               |
| MR-20 | Shuffle options                           | Cheap, prevents a visible weakness       |
| MR-22 | Minimum question bank and validator check | Planner rules need enough questions      |
| MR-30 | Source and licensing record               | Avoids copying copyrighted textbook text |
| MR-31 | Language review gate                      | Biggest quality risk (Odia)              |
| MR-40 | Persistent storage request                | Protects offline data from eviction      |
| MR-43 | Browser support matrix                    | Sets expectations; limits test scope     |
| MR-44 | Cold-start offline test                   | The core demo claim                      |
|       |                                           |                                          |
| MR-92 | README                                    | Required deliverable                     |

---

## 4. Where These Changes Land

| Existing file                 | Update needed                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_PRD`                    | Add MR-10, MR-11, MR-12, MR-13, MR-14 to section 5; add MR-01 to section 4 goals as P1                                                                                                       |
| `02_WORKFLOW`               | Add MR-12 and MR-13 as planner inputs; add MR-20 and MR-21 to section 5 (assessment flow); add MR-80 baseline step                                                                           |
| `03_TECHNICAL_ARCHITECTURE` | Add MR-40/41 (storage), MR-42 (update flow), MR-50 (sequence numbers); extend the`ProgressEvent` type with `seq` and event types `baseline_check`, `post_check`, `content_flagged` |
| `04_TECH_STACK`             | Add the browser matrix (MR-43)                                                                                                                                                               |
| `05_SECURITY`               | Add MR-03 (PIN hashing), MR-30 (content licensing), MR-50 (replace the strict future-timestamp rejection)                                                                                    |
| `SATHI_Requirements`        | Add the`MR-xx` items as new FR/NFR IDs                                                                                                                                                     |
| `SATHI_Implementation_Plan` | Add tasks: gap-visualization screen, storage persistence, shuffle, bank-size validator, language review, deck and README                                                                     |

## 5. Open Decisions for You

1. **Multiple profiles (MR-01):** do you want this for the demo, or keep one profile and mention it as roadmap? It touches the database keys and the onboarding flow, so it is cheaper to decide before coding.
2. **Content source (MR-30):** will the demo content be original text written by the team, or adapted from a textbook? That decides whether permission is needed.
3. **Teacher loop (MR-60):** build a minimal teacher page, or show escalation as a recorded event only and present the reply path as roadmap?
4. **Reviewer availability (MR-31):** who will review the Odia and Hindi text, and by when? This is the most schedule-sensitive item.
