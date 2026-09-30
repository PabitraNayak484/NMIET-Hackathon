# SATHI: Tech Stack

**Selection criteria (in order):** (1) works offline on low-end Android, (2) fastest path to a reliable demo, (3) small bundle, (4) one language across client-side agent code, (5) easy to explain to a CTO.

---

## 1. Summary

| Layer | Choice | Alternatives considered |
|---|---|---|
| Client | **PWA: React + TypeScript + Vite** | Flutter (heavier, slower to iterate, weaker web demo story) |
| Styling | Plain CSS with CSS variables (or Tailwind if the team prefers) | Component libraries (bundle weight) |
| Local DB | **IndexedDB via Dexie** | SQLite-WASM (larger, more setup risk) |
| Offline | **Service Worker via Workbox (vite-plugin-pwa)** | Hand-written SW |
| Agent | **Custom TypeScript state machine** | LangGraph (Python/JS; overkill and server-bound) |
| Backend | **FastAPI (Python 3.11)** | Node/Express |
| Server DB | **SQLite** (MVP), Postgres-ready via SQLAlchemy | Supabase/Firebase (extra setup, network dependency during dev) |
| LLM | Provider-agnostic gateway (Anthropic Claude API by default) | Direct-from-client calls (rejected: key exposure) |
| Voice (P1) | Web Speech API (STT/TTS) with text fallback | Cloud STT/TTS |
| Testing | Vitest, Playwright, pytest | |
| Deploy | Frontend static host + backend on one small container | Kubernetes (unnecessary) |

---

## 2. Frontend

### 2.1 Why a PWA rather than Flutter
- Installable on Android from Chrome; no app store needed for the hackathon.
- Service worker + IndexedDB give real offline behavior and can be tested by toggling airplane mode.
- The agent is TypeScript; no bridging layer between UI and agent code.
- Small payload: React + Dexie + Workbox is approximately 150-200 KB gzipped.
- Judges can open a URL, and a laptop demo behaves the same as a phone.

*If the team is already strong in Flutter*, the same architecture ports directly: replace Dexie with `sqflite`/`drift` and the service worker with local assets. The agent design, packs and API do not change.

### 2.2 Libraries

| Purpose | Library | Notes |
|---|---|---|
| UI | `react`, `react-dom` | |
| Build | `vite`, `typescript` | |
| PWA | `vite-plugin-pwa` (Workbox) | Precache shell, runtime rules |
| Local DB | `dexie` | Typed stores, migrations |
| State | `zustand` (tiny) | UI state only; learner state lives in Dexie |
| Routing | `wouter` or simple state-based screens | Avoid heavy router |
| IDs | `uuid` (v4/v7) | event ids |
| Validation | `zod` | Runtime validation of packs and API responses |
| Tests | `vitest`, `fake-indexeddb`, `@playwright/test` | |

### 2.3 Fonts and Unicode
- Noto Sans Odia, Noto Sans Devanagari, Noto Sans (Latin) as **subsetted WOFF2**, precached.
- `lang` attribute set per language for correct shaping and line-height.
- Test Odia conjuncts and matras on a real low-end Android device (rendering bugs are the most common multilingual failure).

### 2.4 Performance budget
| Item | Budget |
|---|---|
| JS (gzip) initial | under 200 KB |
| Fonts (subsets, 3 languages) | under 400 KB total, lazy for non-selected languages |
| Content pack (MVP) | under 1 MB |
| Time to interactive on mid-range Android over 3G | under 4 s first load; under 1.5 s repeat load |

---

## 3. Agent Layer

**Choice: custom TypeScript state machine.**

Reasons:
- Must run **on-device offline**; LangGraph's typical deployment is server-side.
- The workflow is a fixed, small graph (8 nodes); a framework adds weight without value.
- Deterministic planner, unit-testable, and fully explainable in the trace.
- The design is compatible with LangGraph concepts (nodes, state, edges), so the team can say: "This maps 1:1 to LangGraph if we move to server orchestration."

Structure: `Tool<I,O>` interface + registry, `Node` functions, `runTurn` executor, `TraceRecorder`.

---

## 4. Backend

| Item | Choice | Reason |
|---|---|---|
| Framework | FastAPI | Typed, auto OpenAPI docs (satisfies "API documentation" deliverable), fast to write |
| Server | Uvicorn | |
| Validation | Pydantic v2 | Strict schemas on all inputs |
| ORM | SQLAlchemy 2.x | SQLite now, Postgres later without rewrite |
| Migrations | Alembic (or simple `create_all` for MVP) | |
| HTTP client | `httpx` (async) | LLM provider calls with timeouts |
| Rate limiting | `slowapi` | Protect LLM proxy |
| Config | `pydantic-settings` + `.env` | |
| Tests | `pytest`, `httpx.AsyncClient` | |

### 4.1 Endpoints (recap)
`GET /api/health`, `POST /api/sync`, `POST /api/llm/rephrase`, `GET /api/content/manifest`, `GET /api/content/packs/{id}`, `POST /api/escalations`. Auto-docs at `/docs`.

---

## 5. Data Stores

| Where | Tech | Contents |
|---|---|---|
| Device | IndexedDB (Dexie) | Profile, learner state, events, content, quiz, language packs |
| Server (MVP) | SQLite file | Students, events, snapshots, escalations |
| Server (scale) | PostgreSQL (managed, e.g. Supabase/RDS) | Same schema; add indexes/partitioning by student |

**Why not Firebase/Supabase for MVP:** extra accounts, keys and network dependence during development; SQLite is zero-config and sufficient for the demo. The SQLAlchemy layer keeps the Postgres migration trivial.

---

## 6. AI / LLM Layer

| Aspect | Decision |
|---|---|
| Role | **Optional rephrasing and fluency**, never source of truth |
| Access | Server-side proxy only; API key in server env |
| Default provider | Anthropic Claude API (e.g. a Sonnet-class model) via a provider interface so it can be swapped |
| Prompting | Retrieval-grounded: source content, class band, language, protected terms and length limit are provided; instruction to add no new facts |
| Validation | Terms preserved, numbers preserved, no new entities, script check, length limit; otherwise template fallback |
| Timeouts | 6 s; max 2 retries; circuit breaker 60 s |
| Cost control | Per-device rate limit; cache responses keyed by `(topic, concept, class band, language, hash(constraints))` |
| Future | On-device small model behind the same `generate_explanation` tool |

**Voice (P1):** browser Web Speech API for STT/TTS where the language is supported (Hindi and English widely; Odia support is limited and device-dependent). Feature-detect, and fall back to text with a visible notice, as per the brief's fallback rule.

---

## 7. Content Tooling

| Tool | Purpose |
|---|---|
| JSON Schema (`pack.schema.json`, `language.schema.json`) | Validate structure |
| `validate_pack.py` | Checks: every topic has all languages, every MCQ option is tagged, prerequisites exist, aliases unique, protected terms preserved in every language text |
| Manifest generator | Produces versions and sha256 checksums for `/api/content/manifest` |
| Authoring format | Start with JSON; optionally a Google Sheet to JSON exporter for teachers later |

---

## 8. Dev, Test, and Delivery

| Concern | Tooling |
|---|---|
| Package management | `pnpm` (or npm), `pip` + `venv` |
| Lint/format | ESLint, Prettier, Ruff |
| CI (optional) | GitHub Actions: lint, unit tests, pack validation |
| E2E offline test | Playwright with `context.setOffline(true)` and LLM-blocked config |
| Containers (optional) | Single `docker-compose.yml`: `frontend` (static), `backend` |

### Environment variables (`.env.example`)
```
# Backend
APP_ENV=development
DATABASE_URL=sqlite:///./sathi.db
LLM_PROVIDER=anthropic
LLM_API_KEY=changeme
LLM_MODEL=claude-sonnet-4-6
LLM_TIMEOUT_SECONDS=6
LLM_ENABLED=true
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT_LLM_PER_MIN=20
CONTENT_PACK_DIR=../content/packs
DEBUG_ENDPOINTS_ENABLED=false

# Frontend (build-time)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_DEBUG_PANEL=false
```

---

## 9. Deployment

| Piece | Simplest reliable option |
|---|---|
| Frontend | Static hosting: Vercel, Netlify, or Cloudflare Pages (HTTPS is mandatory for service workers) |
| Backend | One container on Render, Railway, or Fly.io; or a laptop plus a tunnel for the hackathon |
| Fallback | If the cloud is unreachable at the venue, the PWA still works offline; run the backend locally with `uvicorn` on the presenter laptop |
| HTTPS | Required for SW and install prompt (`localhost` is exempt in dev) |

**Demo hygiene:** deploy 24 hours early, install the PWA on the demo phone, run the pre-warm flow, and verify airplane-mode operation.

---

## 10. Run Commands (target)

```bash
# Content validation
python content/tools/validate_pack.py content/packs/class7-science-v1.json

# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && pnpm install && pnpm dev          # http://localhost:5173
pnpm build && pnpm preview                       # test service worker / offline

# Tests
pnpm test && pnpm e2e
cd backend && pytest
```

**Offline test:** open the app online once, then in Chrome DevTools choose Application, Service Workers, Offline (or use airplane mode on the phone), reload, and complete the full learning loop.
