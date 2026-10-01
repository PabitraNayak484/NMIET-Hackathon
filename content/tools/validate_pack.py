#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
SATHI Content Pack Validator
Usage:
    python validate_pack.py <pack_file.json> [--languages en,hi,or]

Checks:
  1. JSON Schema validation (pack.schema.json)
  2. Every topic has all required languages in content, examples,
     misconceptions, quiz stems and options
  3. Every MCQ option is tagged (correct=true OR misconception_id)
  4. Prerequisites exist in the same pack
  5. Aliases are unique within the pack
  6. Protected glossary terms appear in every language text for that topic
  7. Language packs are complete against language.schema.json
"""

import sys
import json
import argparse
from pathlib import Path

# ---------------------------------------------------------------------------
# Try to import jsonschema; give a clear error if missing
# ---------------------------------------------------------------------------
try:
    import jsonschema
    from jsonschema import validate, ValidationError
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

SCHEMA_DIR = Path(__file__).parent.parent / "schema"
PACK_SCHEMA_PATH  = SCHEMA_DIR / "pack.schema.json"
LANG_SCHEMA_PATH  = SCHEMA_DIR / "language.schema.json"
LANGUAGES_DIR     = Path(__file__).parent.parent / "languages"
DEFAULT_LANGUAGES = ["en", "hi", "or"]

# ANSI colour helpers
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):     print(f"  {GREEN}[OK]{RESET}   {msg}")
def fail(msg):   print(f"  {RED}[ERR]{RESET}  {msg}")
def warn(msg):   print(f"  {YELLOW}[WARN]{RESET} {msg}")
def header(msg): print(f"\n{BOLD}{msg}{RESET}")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_multilingual(obj: dict, langs: list[str], label: str) -> list[str]:
    """Return list of missing language keys."""
    return [lg for lg in langs if lg not in obj]


# ---------------------------------------------------------------------------
# Pack validation
# ---------------------------------------------------------------------------

def validate_pack(pack_path: Path, languages: list[str]) -> int:
    """Returns number of errors found."""
    errors = 0
    warnings = 0

    header(f"Validating pack: {pack_path.name}")

    # 1. JSON Schema
    if HAS_JSONSCHEMA and PACK_SCHEMA_PATH.exists():
        pack_schema = load_json(PACK_SCHEMA_PATH)
        pack = load_json(pack_path)
        try:
            validate(instance=pack, schema=pack_schema)
            ok("JSON Schema validation passed")
        except ValidationError as e:
            fail(f"JSON Schema error: {e.message} at {list(e.path)}")
            errors += 1
            return errors   # schema failure — rest of checks may be noisy
    elif not HAS_JSONSCHEMA:
        warn("jsonschema not installed — skipping schema check (pip install jsonschema)")
    else:
        warn(f"Schema file not found at {PACK_SCHEMA_PATH} — skipping schema check")
        pack = load_json(pack_path)
    
    if 'pack' not in dir():
        pack = load_json(pack_path)

    topics = pack.get("topics", [])
    topic_ids = {t["topic_id"] for t in topics}
    all_alias_sets: dict[str, list[str]] = {}  # lang -> all aliases

    # Collect all aliases for uniqueness check
    for topic in topics:
        for lang, aliases in topic.get("aliases", {}).items():
            all_alias_sets.setdefault(lang, []).extend(aliases)

    # 2. Per-topic checks
    header("Topic checks:")
    for topic in topics:
        tid = topic["topic_id"]

        # 2a. Prerequisites exist
        for prereq in topic.get("prerequisites", []):
            if prereq not in topic_ids:
                fail(f"[{tid}] Prerequisite '{prereq}' not found in pack")
                errors += 1
            else:
                ok(f"[{tid}] Prerequisite '{prereq}' found")

        # 2b. Aliases for required languages
        for lang in languages:
            if lang not in topic.get("aliases", {}):
                fail(f"[{tid}] Missing aliases for language '{lang}'")
                errors += 1
        ok(f"[{tid}] Aliases present for {languages}")

        # 2c. Concepts: multilingual content + examples
        for concept in topic.get("concepts", []):
            cid = concept["concept_id"]
            missing_content = check_multilingual(concept.get("content", {}), languages, "content")
            missing_examples = check_multilingual(concept.get("examples", {}), languages, "examples")
            if missing_content:
                fail(f"[{tid}.{cid}] Missing content language(s): {missing_content}")
                errors += 1
            else:
                ok(f"[{tid}.{cid}] Content: all languages present")
            if missing_examples:
                fail(f"[{tid}.{cid}] Missing examples language(s): {missing_examples}")
                errors += 1
            else:
                ok(f"[{tid}.{cid}] Examples: all languages present")

        # 2d. Misconceptions: multilingual description + remediation
        for mc in topic.get("misconceptions", []):
            mcid = mc["id"]
            for field in ["description", "remediation_example"]:
                missing = check_multilingual(mc.get(field, {}), languages, field)
                if missing:
                    fail(f"[{tid}.{mcid}] Missing {field} language(s): {missing}")
                    errors += 1
                else:
                    ok(f"[{tid}.{mcid}] {field}: all languages present")

        # 2e. Quiz: stems multilingual + options tagged
        for q in topic.get("quiz", []):
            qid = q["question_id"]
            missing_stem = check_multilingual(q.get("stem", {}), languages, "stem")
            if missing_stem:
                fail(f"[{tid}.{qid}] Missing stem language(s): {missing_stem}")
                errors += 1
            else:
                ok(f"[{tid}.{qid}] Stem: all languages present")

            has_correct = False
            for opt in q.get("options", []):
                oid = opt["id"]
                # Option text multilingual
                missing_text = check_multilingual(opt.get("text", {}), languages, "text")
                if missing_text:
                    fail(f"[{tid}.{qid}.{oid}] Missing option text language(s): {missing_text}")
                    errors += 1

                # Tagged correctly
                is_correct = opt.get("correct", False)
                has_misconception = "misconception_id" in opt

                if is_correct:
                    has_correct = True
                elif not has_misconception:
                    # Allow explicit null misconception_id for neutral wrong answers
                    if opt.get("misconception_id") is None and "misconception_id" in opt:
                        pass  # explicitly null — acceptable
                    else:
                        warn(f"[{tid}.{qid}.{oid}] Wrong option has no misconception_id (null is acceptable)")
                        warnings += 1

            if not has_correct:
                fail(f"[{tid}.{qid}] No correct option marked")
                errors += 1
            else:
                ok(f"[{tid}.{qid}] Has a correct option")

    # 3. Alias uniqueness
    header("Alias uniqueness:")
    for lang, aliases in all_alias_sets.items():
        seen = set()
        dupes = []
        for a in aliases:
            if a in seen:
                dupes.append(a)
            seen.add(a)
        if dupes:
            fail(f"Duplicate aliases in '{lang}': {dupes}")
            errors += 1
        else:
            ok(f"Aliases unique for '{lang}'")

    # 4. Protected glossary terms appear in all language content
    header("Protected term coverage:")
    protected_terms = {
        g["term_id"]: g for g in pack.get("glossary", []) if g.get("protected")
    }
    for topic in topics:
        tid = topic["topic_id"]
        # Collect all text for the topic per language
        lang_texts: dict[str, str] = {lg: "" for lg in languages}
        for concept in topic.get("concepts", []):
            for lg in languages:
                lang_texts[lg] += " " + concept.get("content", {}).get(lg, "")
        for term_id, glossary_entry in protected_terms.items():
            for lg in languages:
                # The term's representation in this language
                term_repr = glossary_entry.get("term", {}).get(lg, "")
                en_repr   = glossary_entry.get("term", {}).get("en", term_id)
                text      = lang_texts.get(lg, "")
                # Check if EITHER the localized term OR the English term appears in the text
                if term_repr and term_repr.lower() in text.lower():
                    ok(f"[{tid}] Protected term '{term_id}' found in {lg} content")
                elif en_repr.lower() in text.lower():
                    ok(f"[{tid}] Protected term '{term_id}' found as English fallback in {lg} content")
                else:
                    warn(f"[{tid}] Protected term '{term_id}' may be missing from {lg} content")
                    warnings += 1

    # 5. Summary
    header("Summary:")
    print(f"  Errors:   {errors}")
    print(f"  Warnings: {warnings}")
    if errors == 0:
        print(f"\n  {GREEN}{BOLD}[PASS] Pack is valid!{RESET}")
    else:
        print(f"\n  {RED}{BOLD}[FAIL] Pack has {errors} error(s). Fix before use.{RESET}")

    return errors


# ---------------------------------------------------------------------------
# Language pack validation
# ---------------------------------------------------------------------------

def validate_language_packs(languages: list[str]) -> int:
    errors = 0
    header("Validating language packs:")

    if HAS_JSONSCHEMA and LANG_SCHEMA_PATH.exists():
        lang_schema = load_json(LANG_SCHEMA_PATH)
    else:
        lang_schema = None
        if not HAS_JSONSCHEMA:
            warn("jsonschema not installed — skipping language schema check")
        else:
            warn(f"Language schema not found at {LANG_SCHEMA_PATH}")

    for lang in languages:
        lang_path = LANGUAGES_DIR / f"{lang}.json"
        if not lang_path.exists():
            fail(f"Language pack not found: {lang_path}")
            errors += 1
            continue

        lang_pack = load_json(lang_path)

        if lang_schema:
            try:
                validate(instance=lang_pack, schema=lang_schema)
                ok(f"[{lang}] Schema valid")
            except ValidationError as e:
                fail(f"[{lang}] Schema error: {e.message} at {list(e.path)}")
                errors += 1
        else:
            ok(f"[{lang}] Pack loaded (schema check skipped)")

        # Cross-check: all ui_translation keys are non-empty strings
        ui = lang_pack.get("ui_translations", {})
        empty = [k for k, v in ui.items() if not v.strip()]
        if empty:
            fail(f"[{lang}] Empty UI translation keys: {empty}")
            errors += 1
        else:
            ok(f"[{lang}] All UI translations non-empty")

    return errors


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SATHI content pack validator")
    parser.add_argument("pack", nargs="?", help="Path to pack JSON file (optional — validates all packs if omitted)")
    parser.add_argument("--languages", default=",".join(DEFAULT_LANGUAGES),
                        help=f"Comma-separated language codes (default: {','.join(DEFAULT_LANGUAGES)})")
    parser.add_argument("--skip-lang-packs", action="store_true",
                        help="Skip language pack validation")
    args = parser.parse_args()

    langs = [l.strip() for l in args.languages.split(",")]
    total_errors = 0

    if args.pack:
        pack_path = Path(args.pack)
        if not pack_path.exists():
            print(f"{RED}Error: file not found: {pack_path}{RESET}")
            sys.exit(1)
        total_errors += validate_pack(pack_path, langs)
    else:
        # Validate all packs in the packs/ directory
        packs_dir = Path(__file__).parent.parent / "packs"
        pack_files = list(packs_dir.glob("*.json"))
        if not pack_files:
            print(f"{YELLOW}No pack files found in {packs_dir}{RESET}")
        for pf in pack_files:
            total_errors += validate_pack(pf, langs)

    if not args.skip_lang_packs:
        total_errors += validate_language_packs(langs)

    sys.exit(0 if total_errors == 0 else 1)


if __name__ == "__main__":
    main()
