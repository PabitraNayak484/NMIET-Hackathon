# SATHI: Security and Privacy

SATHI serves children, often on shared devices. The guiding rule is **collect less, keep it local, expose nothing by default.**

---

## 1. Principles

1. **Data minimization:** no name, phone, email, address, photo or precise location in the MVP.
2. **Local first:** learner data lives on the device; the cloud receives only what sync needs.
3. **Least privilege:** the client never holds secrets; debug/admin functions are off by default.
4. **Validate everything:** all inputs, all packs, all LLM outputs.
5. **Fail closed, fail friendly:** errors reveal nothing internal to students.
6. **Child-safe by design:** curriculum-grounded answers, no open-web browsing, no social features.

---

## 2. Data Inventory

| Data | Where | Sensitivity | Retention |
|---|---|---|---|
| Anonymous student ID (UUID) | Device, server | Pseudonymous | Until user clears or account deleted |
| Class, board, language, subjects, preferences | Device, server | Low | Same |
| Mastery, attempts, misconceptions | Device, server | Low-Medium (educational profile) | Same |
| Progress events | Device, server | Low-Medium | Device: until synced + 30 days; server: configurable (default 12 months) |
| Free-text questions | Device only by default | Medium (children may type personal info) | Stored in local history only; **not** synced or sent to LLM unless the topic is matched (see 5.2) |
| Device ID (random UUID) | Device, server | Pseudonymous | Same as student data |
| LLM prompts | Sent to provider only when online | Must contain no identifiers | Provider retention per contract; request zero-retention where offered |

**Not collected:** real name, contact details, GPS, contacts, microphone recordings (voice is processed by the browser and only the resulting text is used), analytics trackers, advertising IDs.

---

## 3. Threat Model (MVP)

| # | Threat | Impact | Mitigation |
|---|---|---|---|
| T1 | LLM API key stolen from the client | Cost abuse | Key only on server; client calls `/api/llm/rephrase` |
| T2 | Abuse of the LLM proxy (spam, cost) | Cost, availability | Rate limiting per device and IP; request size caps; only structured topic-bound requests (no arbitrary prompt passthrough) |
| T3 | Prompt injection via student text or content | Unsafe or off-topic output | Student text never enters the LLM prompt raw; only `topic_id`, source content and constraints are sent; output validator; template fallback |
| T4 | Tampered sync payload (fake mastery, SQL injection) | Data integrity | Pydantic validation, parameterized queries (ORM), event types allowlist, server recomputes state from events |
| T5 | Replay/duplicate events | Corrupted progress | Idempotent `event_id` primary key |
| T6 | Malicious or corrupted content pack | Wrong or harmful content | Schema validation, sha256 checksums from manifest over HTTPS, version pinning, reject on failure and keep previous |
| T7 | XSS through content or questions | Session/data theft | Render text as text (React escaping), no `dangerouslySetInnerHTML`, strict CSP |
| T8 | Shared device exposes child's data to others | Privacy | "Clear my data" control; no sensitive data stored; optional 4-digit local PIN (P1) |
| T9 | Data interception on network | Confidentiality | HTTPS/TLS only; HSTS |
| T10 | Debug endpoints/panels left on | Info leak | `DEBUG_ENDPOINTS_ENABLED=false` in prod; `?debug=1` panel only when `VITE_DEBUG_PANEL=true` |
| T11 | Enumeration of other students' data | Privacy | No read endpoint by student ID exposed to client except own; sync returns only state for IDs in the request; IDs are unguessable UUIDv4 |
| T12 | Inappropriate LLM output for children | Safety | Grounded prompts, output validator, blocklist check, system prompt with child-safety rules, template fallback |
| T13 | Dependency vulnerabilities | Compromise | Lockfiles, `npm audit`/`pip-audit`, minimal dependencies |
| T14 | Local storage tampering by user | Fake local progress | Acceptable risk (self-affecting); server recomputes from events and does not trust derived values |

---

## 4. Authentication and Identity (MVP)

- **Local anonymous profile:** the app generates `student_id` (UUIDv4) and `device_id` on first run. No login.
- **Server trust model:** the server treats `student_id` as an opaque pseudonymous key and stores only what is sent; it does not expose it to anyone else.
- **Sync request signing (recommended, low effort):** at first sync the server issues a random `sync_token` bound to `student_id + device_id`; subsequent sync requests must present it as `Authorization: Bearer <token>`. This prevents random third parties from writing events into another student's record.
- **Future (post-MVP):** school-issued codes, teacher accounts with role-based access, OAuth/phone-OTP for parents.

---

## 5. Application Security Controls

### 5.1 Client (PWA)
| Control | Detail |
|---|---|
| CSP | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://<api-host>; frame-ancestors 'none'; object-src 'none'; base-uri 'self'` |
| No inline script/eval | Enforced by CSP and build config |
| Escaping | React default; no raw HTML from content or LLM |
| Storage | IndexedDB only for learner data; no secrets, no tokens beyond `sync_token` |
| Service worker | Scope limited to app origin; versioned cache; old caches purged on update |
| Input validation | Length caps (question max 300 chars), Unicode normalization, control-character stripping |
| Subresource integrity | Not needed if all assets are self-hosted (recommended: no CDN dependencies at runtime) |
| Clear data | Settings button deletes IndexedDB stores, SW caches optionally, and generates a fresh anonymous ID; offers to request server-side deletion |

### 5.2 LLM privacy and safety
| Control | Detail |
|---|---|
| No identifiers in prompts | Prompt includes topic content, class band, language and constraints only; never student ID, device ID, or raw student text |
| No raw student text | Free text is used locally for topic matching only; if it must be sent (optional feature), it is passed through a PII filter (phone, email, long digit strings) and length-capped |
| System prompt rules | Age-appropriate, stay within provided content, no new facts, no personal-data requests, refuse off-topic |
| Output validation | Protected terms, numbers, script, length, blocklist; else discard |
| Provider settings | Use API tier with no training on customer data; request zero data retention if available |
| Logging | Log request metadata (latency, status, topic_id), **not** content, in production |

### 5.3 Backend (FastAPI)
| Control | Detail |
|---|---|
| Input validation | Pydantic models with `extra="forbid"`, enum allowlists for `event_type`, regex for IDs, max lengths, max batch 50, max body 64 KB |
| SQL injection | SQLAlchemy ORM / bound parameters only |
| CORS | Explicit `ALLOWED_ORIGINS`; no wildcard in production |
| Rate limiting | `slowapi`: e.g. `/api/llm/*` 20/min per device, `/api/sync` 30/min per device |
| Error handling | Generic error bodies; stack traces only in server logs; `debug=False` |
| Secrets | Environment variables or platform secret store; `.env` in `.gitignore`; `.env.example` committed with placeholders |
| Transport | HTTPS only; HSTS; TLS 1.2+ |
| Headers | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Cache-Control: no-store` on API responses |
| Timeouts | Upstream (LLM) 6 s; request timeout at server |
| Dependency hygiene | Pin versions; `pip-audit` before release |
| Admin/debug | No admin endpoints in MVP; any debug route requires `DEBUG_ENDPOINTS_ENABLED=true` and a shared secret header, and is disabled in production |

### 5.4 Sync integrity and conflict safety
- Append-only event log; the server never overwrites, only inserts (`INSERT ... ON CONFLICT DO NOTHING`).
- Server validates: `event_type` in allowlist, `topic_id` exists in the pack, timestamp not more than 24 h in the future and not older than 1 year, payload matches per-type schema.
- Server-side mastery is **recomputed from validated events**, so a manipulated client cannot inject arbitrary mastery values.
- Rejected events are returned with reasons and never silently dropped.

### 5.5 Local data integrity
- Schema version and migration check at boot.
- Content packs verified by sha256 against the manifest before activation.
- Event log validated on load (schema check); corrupt records quarantined, not deleted.
- If the DB fails to open: rebuild from bundled seed pack; preserve the event log if readable.

---

## 6. Privacy and Child Safety

| Topic | Approach |
|---|---|
| Legal context (India) | Design aligned to the spirit of the **Digital Personal Data Protection Act, 2023**, which requires verifiable parental consent and restricts tracking/targeted advertising for children. Legal review is required before real deployment. *(Not legal advice.)* |
| Consent | First-run notice in the child's language: what is stored, that it stays on the device unless sync is on, with parent/guardian acknowledgement toggle for cloud sync |
| Sync opt-in | Cloud sync is **opt-in** per device (default ON in the hackathon demo, clearly disclosed; default OFF for production pilots until consent is captured) |
| No tracking or ads | No third-party analytics, no ad SDKs, no fingerprinting |
| Content safety | Answers come from the verified pack; no web search; no user-generated content shared with other users |
| Deletion | Local: one-tap clear. Server: `DELETE /api/students/{id}` (with sync token) removes student, events, snapshots |
| Access by teachers/parents (future) | Role-based, consent-gated, audited |
| Data residency | Host the server in an India region for production |

---

## 7. Logging, Monitoring, Incident Response

| Area | MVP practice |
|---|---|
| Logs | Structured JSON; no PII; no request bodies; retain 14 days |
| Metrics | Request rate, error rate, LLM latency and failure rate, sync accepted/duplicate/rejected counts |
| Alerts | LLM error spike, sync 5xx spike (manual review acceptable for the hackathon) |
| Incident steps | Rotate LLM key, disable LLM via `LLM_ENABLED=false` (app continues on templates), notify, and post-mortem |
| Kill switch | `LLM_ENABLED=false` demonstrates graceful degradation and is a good CTO-question answer |

---

## 8. Security Checklist (pre-demo and pre-pilot)

**Pre-demo (must):**
- [ ] No API keys in the frontend bundle (`grep` build output)
- [ ] `.env` not committed
- [ ] HTTPS on the deployed frontend and API
- [ ] CORS restricted to the frontend origin
- [ ] Debug endpoints/panel disabled in the deployed build (enable only on the presenter's copy)
- [ ] Pydantic `extra="forbid"` on all request models
- [ ] Sync idempotency verified (send the same batch twice, then confirm zero duplicates)
- [ ] LLM output validator tested with adversarial cases (missing term, extra number, wrong script)
- [ ] "Clear my data" works and leaves the app functional
- [ ] CSP header present and no console CSP violations

**Pre-pilot (should):**
- [ ] `sync_token` authorization implemented
- [ ] Parent/guardian consent flow and privacy notice reviewed by legal counsel
- [ ] `DELETE /api/students/{id}` implemented and tested
- [ ] Dependency audit (`pnpm audit`, `pip-audit`) clean or accepted
- [ ] Penetration test or peer security review
- [ ] Backup and restore for the server DB; encryption at rest on the managed DB
- [ ] Data retention job for old events

---

## 9. Answers to Likely Judge Questions

| Question | Answer |
|---|---|
| How do you keep student data safe? | Anonymous IDs only, data stays on-device by default, sync sends only events, HTTPS, validated inputs, server recomputes state, clear-data control. |
| What goes to the LLM? | Curriculum text, class band, language and constraints. No student identifiers and no raw student text. |
| What if the LLM misbehaves? | Output validator plus template fallback; kill switch `LLM_ENABLED=false`; the app keeps working offline-style. |
| Can a student cheat by editing local data? | Yes, but it only affects their own view; the server recomputes from events and nothing is shared with others. |
| Is it compliant with child data law? | Designed with minimization, consent and deletion in mind, aligned to the spirit of India's DPDP Act 2023; formal compliance review is a pre-pilot step. |
