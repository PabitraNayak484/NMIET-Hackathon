# SATHI API Reference

> **Version:** 1.0.0  
> **Base URL:** `http://localhost:8000`

_Auto-generated from FastAPI OpenAPI schema. Run `python scripts/gen_api_docs.py` to regenerate._

---

## Table of Contents

- [`GET` `/api/health`](#service-health-check)
- [`POST` `/api/sync`](#batch-sync-progress-events-from-client)
- [`POST` `/api/llm/rephrase`](#rephrase-curriculum-text-via-llm-with-anti-hallucination-validation)
- [`GET` `/api/content/manifest`](#list-available-content-packs-with-version-and-checksum)
- [`GET` `/api/content/packs/{pack_id}`](#download-a-content-pack-as-raw-json)
- [`POST` `/api/escalations`](#student-submits-a-question-for-teacher-escalation)
- [`GET` `/api/escalations/{escalation_id}`](#poll-escalation-status-student)
- [`PATCH` `/api/escalations/{escalation_id}/reply`](#teacher-adds-a-reply-to-an-escalation-mr-60)

---

## Service health check

`GET` **`/api/health`**

**Tags:** health

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |

### Example

```bash
curl -X GET http://localhost:8000/api/health \
  -H "Content-Type: application/json"
```

---

## Batch sync progress events from client

`POST` **`/api/sync`**

**Tags:** sync

### Request body — `SyncRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `device_id` | `string` | ✓ |  |
| `student` | `object` | ✓ |  |
| `events` | `array` | ✓ |  |

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |
| `422` | Validation Error |

### Example

```bash
curl -X POST http://localhost:8000/api/sync \
  -H "Content-Type: application/json"
```

---

## Rephrase curriculum text via LLM with anti-hallucination validation

`POST` **`/api/llm/rephrase`**

**Tags:** llm

### Request body — `RephraseRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `topic_id` | `string` | ✓ | Content topic being explained |
| `class_num` | `integer` | ✓ | Student's class (1–12) |
| `language` | `string` | ✓ | Target language code: en | hi | or |
| `source_text` | `string` | ✓ | Original template-generated explanation text |
| `protected_terms` | `array` |  | Glossary terms that must appear verbatim in the output |
| `max_words` | `integer` |  |  |

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |
| `422` | Validation Error |

### Example

```bash
curl -X POST http://localhost:8000/api/llm/rephrase \
  -H "Content-Type: application/json"
```

---

## List available content packs with version and checksum

`GET` **`/api/content/manifest`**

**Tags:** content

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |

### Example

```bash
curl -X GET http://localhost:8000/api/content/manifest \
  -H "Content-Type: application/json"
```

---

## Download a content pack as raw JSON

`GET` **`/api/content/packs/{pack_id}`**

**Tags:** content

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |
| `422` | Validation Error |

### Example

```bash
curl -X GET http://localhost:8000/api/content/packs/{pack_id} \
  -H "Content-Type: application/json"
```

---

## Student submits a question for teacher escalation

`POST` **`/api/escalations`**

**Tags:** escalations

### Request body — `EscalationCreate`

| Field | Type | Required | Description |
|---|---|---|---|
| `student_id` | `string` | ✓ |  |
| `topic_or_question` | `string` | ✓ |  |
| `language` | `string` | ✓ |  |

### Responses

| Status | Description |
|---|---|
| `201` | Successful Response |
| `422` | Validation Error |

### Example

```bash
curl -X POST http://localhost:8000/api/escalations \
  -H "Content-Type: application/json"
```

---

## Poll escalation status (student)

`GET` **`/api/escalations/{escalation_id}`**

**Tags:** escalations

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |
| `422` | Validation Error |

### Example

```bash
curl -X GET http://localhost:8000/api/escalations/{escalation_id} \
  -H "Content-Type: application/json"
```

---

## Teacher adds a reply to an escalation (MR-60)

`PATCH` **`/api/escalations/{escalation_id}/reply`**

**Tags:** escalations

### Request body — `ReplyPayload`

| Field | Type | Required | Description |
|---|---|---|---|
| `reply` | `string` | ✓ |  |

### Responses

| Status | Description |
|---|---|
| `200` | Successful Response |
| `422` | Validation Error |

### Example

```bash
curl -X PATCH http://localhost:8000/api/escalations/{escalation_id}/reply \
  -H "Content-Type: application/json"
```

---
