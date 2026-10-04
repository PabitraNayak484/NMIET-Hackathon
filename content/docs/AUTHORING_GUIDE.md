# SATHI Content Authoring Guide (MR-34)

> How to write, review, and validate content for SATHI's JSON content packs.  
> Follow this guide any time you add a new topic, question, misconception, or glossary entry.

---

## 1. Writing a Concept

A **concept** is one atomic idea within a topic (e.g., *"What photosynthesis is"*).

### Rules
- Write in plain, everyday language. Avoid textbook jargon unless it is a protected term.
- One concept = one idea. If you need to explain two ideas, use two concepts.
- Keep `content` under **120 words** per language for Class 7 (adjust ±20 words per class level).
- Every concept must have **at least 2 `examples`** per language.

### Schema
```json
{
  "concept_id": "photo_definition",
  "content": {
    "en": "Photosynthesis is the process by which green plants make their own food...",
    "hi": "प्रकाश संश्लेषण वह प्रक्रिया है जिसके द्वारा हरे पौधे अपना भोजन बनाते हैं...",
    "or": "ଫଟୋସିନ୍ଥେସିସ୍ ହେଉଛି ଯେଉଁ ପ୍ରକ୍ରିୟା ଦ୍ୱାରା ସବୁଜ ଉଦ୍ଭିଦ ନିଜର ଖାଦ୍ୟ ତିଆରି କରନ୍ତି..."
  },
  "examples": {
    "en": ["A mango tree makes food in its leaves using sunlight.", "Grass in a field turns sunlight into sugar every day."],
    "hi": ["एक आम का पेड़ अपनी पत्तियों में सूरज की रोशनी का उपयोग करके भोजन बनाता है।", "..."],
    "or": ["..."]
  }
}
```

### Everyday example formula
> *[Familiar object/animal] + [action that maps to the concept] + [outcome the student can see or feel].*

Example: *"A mango tree (familiar object) makes food in its leaves (action) using sunlight (outcome the student can see)."*

---

## 2. Writing a Misconception and a Distractor Option

A **misconception** is a specific wrong belief students commonly hold.  
A **distractor** is a wrong MCQ answer option that targets a known misconception.

### Misconception rules
- Name it from the **student's perspective**, not the teacher's.  
  ✅ `"Plants get food from soil"` — this is what the student thinks.  
  ❌ `"Students confuse soil nutrients with food synthesis"` — too meta.
- Every misconception needs a `remediation_example` — a brief everyday analogy that corrects it.
- A topic must have **≥ 1 misconception** to pass the validator.

### Distractor rules
- Every wrong option **must** carry `"misconception_id"` pointing to the misconception it targets.
- Every correct option **must** carry `"correct": true`.
- Never leave an option untagged — the validator will `exit 1`.
- Distractors should sound plausible to a student who holds the misconception.

### Schema
```json
{
  "id": "mc_soil_food",
  "description": {
    "en": "Plants get food from the soil, not from sunlight.",
    "hi": "पौधे अपना भोजन मिट्टी से प्राप्त करते हैं, सूर्य के प्रकाश से नहीं।",
    "or": "ଉଦ୍ଭିଦ ସୂର୍ଯ୍ୟ ଆଲୋକରୁ ନୁହେଁ, ମାଟିରୁ ଖାଦ୍ୟ ପାଆନ୍ତି।"
  },
  "remediation_example": {
    "en": "Think of a solar panel: it makes electricity from sunlight, not from the ground it sits on. A leaf works the same way.",
    "hi": "सोलर पैनल के बारे में सोचें: यह जमीन से नहीं, सूर्य के प्रकाश से बिजली बनाता है। पत्ती भी इसी तरह काम करती है।",
    "or": "ଏକ ସୌର ପ୍ୟାନେଲ ବିଷୟରେ ଭାବନ୍ତୁ: ଏହା ମାଟିରୁ ନୁହେଁ, ସୂର୍ଯ୍ୟ ଆଲୋକରୁ ବିଦ୍ୟୁତ ତିଆରି କରେ।"
  }
}
```

### MCQ option tagging example
```json
{
  "id": "q1_opt_b",
  "text": { "en": "The plant absorbs food from the soil", "hi": "...", "or": "..." },
  "misconception_id": "mc_soil_food"
}
```

---

## 3. Writing a Quiz Question

### Rules
- **Minimum 8 questions per topic** (enforced by validator — `exit 1` if not met).
- **At least 2 questions per misconception** (`exit 1` if not met).
- Difficulty distribution: 3 easy · 3 medium · 2 hard (at minimum).
- Every question must have **exactly one** correct option tagged `"correct": true`.
- Stems must be in all 3 languages (`en`, `hi`, `or`).
- Avoid negatives in stems (e.g., *"Which is NOT…"*) for easy and medium questions.

### Difficulty guide

| Level | What it tests | Stem style |
|---|---|---|
| `easy` | Direct recall of a definition or fact | "What is…?", "Which part of the plant…?" |
| `medium` | Applying the concept to a familiar context | "Why does…?", "What happens if…?" |
| `hard` | Multi-step reasoning or comparing concepts | "A plant placed in a dark room for a week…" |

### Schema
```json
{
  "question_id": "q_photo_001",
  "difficulty": "easy",
  "type": "mcq",
  "concept_id": "photo_definition",
  "stem": {
    "en": "Where does a green plant make its food?",
    "hi": "हरा पौधा अपना भोजन कहाँ बनाता है?",
    "or": "ଏକ ସବୁଜ ଉଦ୍ଭିଦ ତା'ର ଖାଦ୍ୟ କଉଠି ତିଆରି କରେ?"
  },
  "options": [
    { "id": "q_photo_001_a", "text": { "en": "In its leaves", "hi": "अपनी पत्तियों में", "or": "ତା'ର ପତ୍ରରେ" }, "correct": true },
    { "id": "q_photo_001_b", "text": { "en": "In the soil", "hi": "मिट्टी में", "or": "ମାଟିରେ" }, "misconception_id": "mc_soil_food" },
    { "id": "q_photo_001_c", "text": { "en": "In the roots", "hi": "जड़ों में", "or": "ମୂଳରେ" }, "misconception_id": "mc_roots_absorb_food" },
    { "id": "q_photo_001_d", "text": { "en": "In the flowers", "hi": "फूलों में", "or": "ଫୁଲରେ" }, "misconception_id": "mc_flowers_produce_food" }
  ]
}
```

---

## 4. Writing a Glossary Entry

A **glossary entry** defines a key term in the student's language with optional protection.

### Rules
- `term_id` must be **globally unique** within the pack.
- `protected: true` means the term must appear **verbatim** (untranslated) in all content and LLM rephrasing for that topic. Use this for scientific terms like *"chlorophyll"* or *"chloroplast"*.
- `protected: false` for terms that can be paraphrased (e.g., *"green leaves"*).
- The validator checks that protected terms appear in the concept `content` for the topic — if missing, it warns.

### Schema
```json
{
  "term_id": "chlorophyll",
  "term": { "en": "Chlorophyll", "hi": "क्लोरोफिल", "or": "କ୍ଲୋରୋଫିଲ" },
  "gloss": {
    "en": "The green pigment in plant leaves that captures sunlight for photosynthesis.",
    "hi": "पौधों की पत्तियों में हरा रंजक जो प्रकाश संश्लेषण के लिए सूर्य की रोशनी को ग्रहण करता है।",
    "or": "ଉଦ୍ଭିଦ ପତ୍ରରେ ସବୁଜ ରଞ୍ଜକ ଯାହା ଫଟୋସିନ୍ଥେସିସ ପାଇଁ ସୂର୍ଯ୍ୟ ଆଲୋକ ଗ୍ରହଣ କରେ।"
  },
  "protected": true
}
```

---

## 5. Running the Validator Locally

Always validate before opening a pull request.

```bash
cd content
python tools/validate_pack.py packs/class7-science-v1.json
# Expected: ✓ All checks passed

# Strict mode — warns if language review metadata is missing:
python tools/validate_pack.py packs/class7-science-v1.json --strict-review
```

### What the validator checks

| Check | Exit code on failure |
|---|---|
| All 3 languages (`en`, `hi`, `or`) present in every concept, example, question stem, option, and misconception | `exit 1` |
| Every MCQ option tagged `correct` or `misconception_id` | `exit 1` |
| ≥ 8 questions per topic | `exit 1` |
| ≥ 2 questions per misconception | `exit 1` |
| `source` and `license` fields present and non-empty | `exit 1` |
| All prerequisites exist in the same pack | `exit 1` |
| Aliases unique within the pack | `exit 1` |
| Protected terms appear in content text (per topic) | `warning` |
| Language `reviewed_by` + `reviewed_on` present (`--strict-review` only) | `warning` |
| No topic ID changed from a prior version without a migration map | `warning` |

---

## 6. Review Workflow

```
Content author → Content review → Language review (Odia/Hindi) → Validator → PR merge
```

### Step-by-step

1. **Write** concepts, misconceptions, quiz questions and glossary entries following Sections 1–4 above.
2. **Run the validator** locally (`exit 0` required before review).
3. **Content review** — a subject-matter reviewer (teacher or curriculum expert) checks:
   - Factual accuracy against BSE-Odisha Class 7 Science syllabus.
   - Appropriate difficulty distribution.
   - Misconceptions are realistic and remediation examples are correct.
   - Reviewer adds their name and date to `content_reviewed_by` / `content_reviewed_on` in the pack JSON.
4. **Language review** — an Odia-fluent and Hindi-fluent reviewer checks:
   - Translations are accurate and age-appropriate.
   - Protected terms are correctly preserved (not translated).
   - Reviewer adds their name and date to the `languages.hi.reviewed_by` / `languages.or.reviewed_by` fields.
5. **Run `--strict-review`** — must produce zero warnings before merge.
6. **Open a PR** — CI runs the validator automatically. PR is blocked if validator exits non-zero.

### Who reviews what

| Review type | Who | Timeline |
|---|---|---|
| Content accuracy | Subject teacher (Class 7 Science) | Before language review |
| Hindi translation | Hindi-fluent team member | After content review |
| Odia translation | Odia-fluent reviewer (external OK) | **Most schedule-sensitive** — book early |

> [!WARNING]
> Odia TTS support is limited (see [Known Limitations](../../docs/KNOWN_LIMITATIONS.md)).  
> Ensure Odia text reads naturally aloud — the browser will attempt TTS even if support is partial.

---

## Quick Checklist Before Submitting

- [ ] Every concept has content + ≥ 2 examples in all 3 languages
- [ ] Every misconception has `description` + `remediation_example` in all 3 languages
- [ ] Every MCQ option is tagged `correct` or `misconception_id`
- [ ] ≥ 8 questions per topic, ≥ 2 per misconception
- [ ] All prerequisites exist in the same pack
- [ ] `source` and `license` fields filled in the pack root
- [ ] `content_reviewed_by` + date filled
- [ ] `languages.hi.reviewed_by` + `languages.or.reviewed_by` + dates filled
- [ ] `python tools/validate_pack.py <pack> --strict-review` → zero errors, zero warnings
