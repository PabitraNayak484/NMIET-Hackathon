#!/usr/bin/env python3
"""
gen_api_docs.py — Generate docs/API.md from the running FastAPI OpenAPI schema.

Usage:
    # Backend must be running first:
    #   cd backend && uvicorn app.main:app --port 8000
    python scripts/gen_api_docs.py

    # Or point at a custom base URL:
    python scripts/gen_api_docs.py --base-url http://localhost:8000

    # Or generate from the OpenAPI JSON file directly (no server needed):
    python scripts/gen_api_docs.py --from-file backend/openapi.json

Output:
    docs/API.md  (overwrites existing file)

Requirements:
    pip install httpx   (only needed when fetching from a live server)
"""

import argparse
import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_openapi(base_url: str) -> dict:
    """Fetch the OpenAPI schema from a running FastAPI server."""
    try:
        import httpx
    except ImportError:
        print("ERROR: 'httpx' is required. Install it with: pip install httpx", file=sys.stderr)
        sys.exit(1)

    url = f"{base_url.rstrip('/')}/openapi.json"
    print(f"Fetching OpenAPI schema from {url} …")
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        print(f"ERROR: Could not fetch {url}: {exc}", file=sys.stderr)
        print("Make sure the backend is running:  cd backend && uvicorn app.main:app --port 8000", file=sys.stderr)
        sys.exit(1)


def load_openapi_file(path: str) -> dict:
    """Load the OpenAPI schema from a local JSON file."""
    fp = Path(path)
    if not fp.exists():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(1)
    with fp.open(encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Markdown rendering helpers
# ---------------------------------------------------------------------------

def _json_block(obj: object) -> str:
    return "```json\n" + json.dumps(obj, indent=2, ensure_ascii=False) + "\n```"


def _schema_to_table(schema: dict, schemas: dict) -> str:
    """Render a JSON Schema object as a markdown property table."""
    if "$ref" in schema:
        ref_name = schema["$ref"].split("/")[-1]
        schema = schemas.get(ref_name, schema)

    props = schema.get("properties", {})
    required_fields = set(schema.get("required", []))
    if not props:
        return "_No properties defined._"

    rows = ["| Field | Type | Required | Description |", "|---|---|---|---|"]
    for name, prop in props.items():
        ptype = prop.get("type", prop.get("$ref", "object").split("/")[-1])
        req = "✅" if name in required_fields else "—"
        desc = prop.get("description", prop.get("title", ""))
        rows.append(f"| `{name}` | `{ptype}` | {req} | {desc} |")
    return "\n".join(rows)


def _resolve_ref(ref: str, schemas: dict) -> dict:
    name = ref.split("/")[-1]
    return schemas.get(name, {})


def _render_request_body(request_body: dict, schemas: dict) -> str:
    lines = []
    content = request_body.get("content", {})
    for media_type, media_obj in content.items():
        schema = media_obj.get("schema", {})
        if "$ref" in schema:
            schema = _resolve_ref(schema["$ref"], schemas)
        lines.append(f"**Content-Type:** `{media_type}`\n")
        lines.append(_schema_to_table(schema, schemas))
        # Provide an example if the schema has one
        if "example" in media_obj:
            lines.append("\n**Example:**\n")
            lines.append(_json_block(media_obj["example"]))
        elif schema.get("example"):
            lines.append("\n**Example:**\n")
            lines.append(_json_block(schema["example"]))
    return "\n".join(lines)


def _render_responses(responses: dict, schemas: dict) -> str:
    lines = []
    for status, resp_obj in responses.items():
        desc = resp_obj.get("description", "")
        lines.append(f"**`{status}`** — {desc}\n")
        content = resp_obj.get("content", {})
        for media_type, media_obj in content.items():
            schema = media_obj.get("schema", {})
            if "$ref" in schema:
                schema = _resolve_ref(schema["$ref"], schemas)
            if schema:
                lines.append(_schema_to_table(schema, schemas))
            if "example" in media_obj:
                lines.append("\n**Example:**\n")
                lines.append(_json_block(media_obj["example"]))
            elif schema.get("example"):
                lines.append("\n**Example:**\n")
                lines.append(_json_block(schema["example"]))
    return "\n".join(lines)


def _render_parameters(parameters: list) -> str:
    if not parameters:
        return ""
    rows = ["| Name | In | Type | Required | Description |", "|---|---|---|---|---|"]
    for p in parameters:
        ptype = p.get("schema", {}).get("type", "string")
        req = "✅" if p.get("required") else "—"
        desc = p.get("description", "")
        rows.append(f"| `{p['name']}` | {p['in']} | `{ptype}` | {req} | {desc} |")
    return "\n".join(rows)


def _anchor(text: str) -> str:
    """GitHub-compatible anchor from a heading string."""
    return text.lower().replace(" ", "-").replace("/", "").replace("{", "").replace("}", "").replace("`", "")


# ---------------------------------------------------------------------------
# Main renderer
# ---------------------------------------------------------------------------

def render_markdown(schema: dict) -> str:
    info = schema.get("info", {})
    title = info.get("title", "API Reference")
    version = info.get("version", "")
    description = info.get("description", "")
    servers = schema.get("servers", [])
    base_url = servers[0]["url"] if servers else "http://localhost:8000"
    schemas = schema.get("components", {}).get("schemas", {})
    paths = schema.get("paths", {})

    lines: list[str] = []

    # Header
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"> **Version:** {version}  ")
    lines.append(f"> **Base URL:** `{base_url}`")
    lines.append("")
    if description:
        lines.append(description)
        lines.append("")
    lines.append("_Auto-generated from FastAPI OpenAPI schema. Run `python scripts/gen_api_docs.py` to regenerate._")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Table of contents
    toc_entries: list[tuple[str, str]] = []  # (display, anchor)
    for path, path_obj in paths.items():
        for method, op in path_obj.items():
            if method in ("get", "post", "put", "patch", "delete"):
                summary = op.get("summary", f"{method.upper()} {path}")
                anchor = _anchor(summary)
                toc_entries.append((f"`{method.upper()}` `{path}` — {summary}", anchor))

    lines.append("## Table of Contents")
    lines.append("")
    for display, anchor in toc_entries:
        lines.append(f"- [{display}](#{anchor})")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Endpoints
    for path, path_obj in paths.items():
        for method, op in path_obj.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue

            summary = op.get("summary", f"{method.upper()} {path}")
            op_desc = op.get("description", "")
            tags = op.get("tags", [])
            parameters = op.get("parameters", [])
            request_body = op.get("requestBody", {})
            responses = op.get("responses", {})

            lines.append(f"## {summary}")
            lines.append("")
            lines.append(f"`{method.upper()}` **`{path}`**")
            lines.append("")
            if tags:
                lines.append(f"**Tags:** {', '.join(tags)}")
                lines.append("")
            if op_desc:
                lines.append(op_desc)
                lines.append("")

            # Parameters
            if parameters:
                lines.append("### Parameters")
                lines.append("")
                lines.append(_render_parameters(parameters))
                lines.append("")

            # Request body
            if request_body:
                lines.append("### Request body")
                lines.append("")
                lines.append(_render_request_body(request_body, schemas))
                lines.append("")

            # Responses
            if responses:
                lines.append("### Responses")
                lines.append("")
                lines.append(_render_responses(responses, schemas))
                lines.append("")

            lines.append("---")
            lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    repo_root = Path(__file__).parent.parent
    out_file = repo_root / "docs" / "API.md"

    parser = argparse.ArgumentParser(description="Generate docs/API.md from FastAPI OpenAPI schema.")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Base URL of running FastAPI server")
    parser.add_argument("--from-file", default=None, metavar="PATH", help="Load OpenAPI JSON from a file instead of a live server")
    parser.add_argument("--out", default=str(out_file), help=f"Output file path (default: {out_file})")
    args = parser.parse_args()

    # Load schema
    if args.from_file:
        schema = load_openapi_file(args.from_file)
    else:
        schema = fetch_openapi(args.base_url)

    # Render
    markdown = render_markdown(schema)

    # Write
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(markdown, encoding="utf-8")
    print(f"✓ Written: {out_path} ({len(markdown):,} bytes, {markdown.count(chr(10))} lines)")


if __name__ == "__main__":
    main()
