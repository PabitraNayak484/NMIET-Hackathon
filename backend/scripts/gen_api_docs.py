#!/usr/bin/env python3
"""
scripts/gen_api_docs.py — generate docs/API.md from FastAPI's OpenAPI schema.

Usage:
    cd backend
    python scripts/gen_api_docs.py

Output: ../docs/API.md
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow importing the app package from scripts/
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app  # noqa: E402

OUTPUT = Path(__file__).parent.parent.parent / "docs" / "API.md"


def _method_badge(method: str) -> str:
    colours = {
        "get": "blue",
        "post": "green",
        "patch": "orange",
        "delete": "red",
    }
    colour = colours.get(method.lower(), "grey")
    return f"`{method.upper()}`"


def _schema_table(schema: dict, schemas: dict) -> str:
    """Render a Pydantic schema as a markdown table."""
    props = schema.get("properties", {})
    required = set(schema.get("required", []))
    if not props:
        return "_No properties._\n"

    lines = ["| Field | Type | Required | Description |", "|---|---|---|---|"]
    for name, prop in props.items():
        # Resolve $ref if needed
        if "$ref" in prop:
            ref_name = prop["$ref"].split("/")[-1]
            prop = schemas.get(ref_name, prop)
        ptype = prop.get("type", prop.get("$ref", "object"))
        req = "✓" if name in required else ""
        desc = prop.get("description", "")
        lines.append(f"| `{name}` | `{ptype}` | {req} | {desc} |")
    return "\n".join(lines) + "\n"


def generate() -> str:
    openapi = app.openapi()
    schemas = openapi.get("components", {}).get("schemas", {})
    paths = openapi.get("paths", {})

    lines: list[str] = [
        "# SATHI API Reference",
        "",
        f"> **Version:** {openapi.get('info', {}).get('version', '?')}  ",
        f"> **Base URL:** `http://localhost:8000`",
        "",
        "_Auto-generated from FastAPI OpenAPI schema. Run `python scripts/gen_api_docs.py` to regenerate._",
        "",
        "---",
        "",
        "## Table of Contents",
        "",
    ]

    # Build ToC
    for path, methods in paths.items():
        for method, op in methods.items():
            if method in ("get", "post", "patch", "delete", "put"):
                summary = op.get("summary", path)
                anchor = summary.lower().replace(" ", "-").replace("/", "").replace("(", "").replace(")", "")
                lines.append(f"- [{_method_badge(method)} `{path}`](#{anchor})")

    lines += ["", "---", ""]

    # Endpoints
    for path, methods in paths.items():
        for method, op in methods.items():
            if method not in ("get", "post", "patch", "delete", "put"):
                continue

            summary = op.get("summary", path)
            description = op.get("description", "")
            tags = op.get("tags", [])

            lines += [
                f"## {summary}",
                "",
                f"{_method_badge(method)} **`{path}`**",
                "",
            ]
            if description:
                lines += [description, ""]
            if tags:
                lines += [f"**Tags:** {', '.join(tags)}", ""]

            # Request body
            req_body = op.get("requestBody", {})
            if req_body:
                content = req_body.get("content", {})
                schema_ref = (
                    content.get("application/json", {})
                    .get("schema", {})
                    .get("$ref", "")
                )
                if schema_ref:
                    schema_name = schema_ref.split("/")[-1]
                    schema = schemas.get(schema_name, {})
                    lines += [
                        f"### Request body — `{schema_name}`",
                        "",
                        _schema_table(schema, schemas),
                    ]

            # Responses
            responses = op.get("responses", {})
            lines += ["### Responses", ""]
            lines += ["| Status | Description |", "|---|---|"]
            for code, resp in responses.items():
                desc = resp.get("description", "")
                lines.append(f"| `{code}` | {desc} |")
            lines += [""]

            # Example (stub)
            lines += [
                "### Example",
                "",
                "```bash",
                f'curl -X {method.upper()} http://localhost:8000{path} \\',
                '  -H "Content-Type: application/json"',
                "```",
                "",
                "---",
                "",
            ]

    return "\n".join(lines)


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    content = generate()
    OUTPUT.write_text(content, encoding="utf-8")
    print(f"[OK] API docs written to {OUTPUT}")
