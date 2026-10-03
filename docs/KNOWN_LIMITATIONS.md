# SATHI — Known Limitations (MR-94)

> Last updated: 2026-10-03  
> All items below are deliberately scoped out of the P1 demo deliverable.  
> Each has a mitigation or user-facing fallback in place.

---

## 1. Odia Voice (TTS / STT)

**Status:** Best-effort  
**Scope:** Browser Web Speech API

| Browser | Odia TTS | Odia STT |
|---|---|---|
| Android Chrome 90+ | ⚠️ System-voice dependent | ❌ Not supported |
| Desktop Chrome | ⚠️ Limited OS voices | ❌ Not supported |
| iOS Safari | ❌ No Odia voice | ❌ Not supported |

**Mitigation:** All UI text is always visible; voice is an enhancement only.  
Text-based interaction always works. The `or` language code maps to Odia text content in the content pack.  
Voice output is attempted via `speechSynthesis.speak()` and silently skipped on failure.

---

## 2. iOS Safari — IndexedDB Eviction Risk

**Status:** Known risk, documented in UI  
**Scope:** iOS 15 and below especially

Safari may evict IndexedDB data when the device's storage is under pressure.
The Background Sync API (`SyncManager`) is **not available** on iOS, so pending
`progress_events` cannot be uploaded automatically on reconnect.

**Mitigation:**
- Storage warning banner shown when usage > 80% of quota (MR-40)
- User is prompted to connect to WiFi and open the app to trigger manual sync
- Progress events are never deleted until confirmed synced (`sync_status = 'synced'`)
- Storage estimate < 25 MB keeps eviction risk low

---

## 3. Single Subject Pack

**Status:** By design for demo  
**Scope:** Content packs

Only one content pack ships with the demo: `class7-science-v1.json` (Class 7, BSE-Odisha, Science).

This pack covers:
- `photosynthesis`
- `parts_of_plant`

**Mitigation:**
- The content pack schema supports unlimited packs and subjects
- Adding a new pack requires authoring a JSON file per `docs/AUTHORING_GUIDE.md` and placing it in `content/packs/`
- The backend `/api/content/manifest` endpoint serves all packs in the configured directory

---

## 4. Profile Limit: 5 per Device

**Status:** Hard limit  
**Scope:** MR-01

Maximum 5 profiles per device, enforced in `profileManager.ts` and the UI.

**Reason:** IndexedDB storage budget and UX clarity.  
**Mitigation:** On the Profile Picker, the "Add Profile" button is disabled and labelled "Maximum 5 profiles" when the limit is reached.

---

## 5. Guess Detection (MR-23) — Deferred to P2

**Status:** Not implemented  
**Scope:** Quiz engine

Fast-tap or random answers currently receive full mastery credit.
There is no time-based or pattern-based guess detection.

**Impact:** A student could game their mastery score by tapping quickly.  
**Mitigation:** Mastery scores reset toward 0 with each wrong answer (mastery decay formula in `mastery.ts`). Persistent gaming eventually locks the student into easy-band questions.

---

## 6. Parent Summary (MR-62) — Deferred to P2

**Status:** Not implemented  
**Scope:** Parent-facing dashboard

A parent-readable weekly summary (topics covered, mastery trend, time spent) is planned for P2.

**Mitigation:** Teachers can see escalations via `/api/escalations`. The gap visualization page is student-readable.

---

## 7. Data Export / Import (MR-52) — Deferred to P2

**Status:** Not implemented  
**Scope:** Data portability

Students cannot export their progress data to a file or import it onto a new device.

**Mitigation:** Cloud sync (POST /api/sync) preserves data server-side when online. Local data is retained indefinitely until the student clears it.
