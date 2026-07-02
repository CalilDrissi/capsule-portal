#!/usr/bin/env python3
"""Local Carbon Design System MCP server.

Serves REAL Carbon data extracted from installed @carbon/* npm packages
(corpus/*.json) plus live doc fetch from carbondesignsystem.com.
No IBM token required. Transport: stdio.
"""
import json
import re
import urllib.request
from pathlib import Path

from mcp.server.fastmcp import FastMCP

CORPUS = Path(__file__).parent / "corpus"


def _load(name):
    return json.loads((CORPUS / name).read_text())


COMPONENTS = _load("components.json")["components"]
THEMES = _load("themes.json")["data"]
COLORS = _load("colors.json")["data"]
TOKENS = _load("tokens.json")["data"]
DOCS = _load("docs-index.json")["docs"]
_BY_TAG = {c["tag"]: c for c in COMPONENTS}

mcp = FastMCP("carbon")


@mcp.tool()
def list_components(query: str = "") -> str:
    """List Carbon web components (cds-* custom elements). Optional substring filter on tag or description."""
    q = query.lower().strip()
    rows = [
        f"{c['tag']}: {c['description'][:80]}"
        for c in COMPONENTS
        if not q or q in c["tag"].lower() or q in c["description"].lower()
    ]
    return f"{len(rows)} components\n" + "\n".join(rows)


@mcp.tool()
def get_component(tag: str) -> str:
    """Get full API for one Carbon web component: attributes (with allowed values) and properties.
    Accepts 'cds-button' or 'button'."""
    tag = tag.strip()
    c = _BY_TAG.get(tag) or _BY_TAG.get(f"cds-{tag}")
    if not c:
        hits = [t for t in _BY_TAG if tag.lower() in t]
        return f"No exact match for {tag!r}. Did you mean: {', '.join(hits[:10]) or 'none'}"
    out = [f"# {c['tag']}", c["description"] or "(no description)", "", "## Attributes"]
    for a in c["attributes"]:
        vals = f"  [values: {', '.join(a['values'])}]" if a["values"] else ""
        out.append(f"- {a['name']}: {a['description'][:120]}{vals}")
    if c["properties"]:
        out.append("\n## Properties")
        for p in c["properties"]:
            out.append(f"- {p['name']}: {p['description'][:120]}")
    return "\n".join(out)


@mcp.tool()
def get_tokens(category: str, theme: str = "g10") -> str:
    """Get real Carbon design tokens. category: 'theme' (theme color tokens; pass theme=white|g10|g90|g100),
    'color' (full palette), 'layout' (spacing/breakpoints), or 'type' (typography)."""
    category = category.lower().strip()
    if category == "theme":
        data = THEMES.get(theme)
        if not data:
            return f"Unknown theme {theme!r}. Available: {', '.join(THEMES)}"
        return f"# theme {theme} ({len(data)} tokens)\n" + "\n".join(f"{k}: {v}" for k, v in data.items())
    if category == "color":
        return json.dumps(COLORS, indent=2)
    if category in ("layout", "spacing", "type"):
        pref = "type." if category == "type" else "layout."
        sub = {k: v for k, v in TOKENS.items() if k.startswith(pref)}
        return json.dumps(sub, indent=2)
    return "category must be one of: theme, color, layout, type"


@mcp.tool()
def search_docs(query: str) -> str:
    """Search the Carbon documentation index (foundations, components, guidelines) by keyword.
    Returns matching titles + URLs; use get_doc(url) to read one."""
    q = query.lower().strip()
    hits = [d for d in DOCS if q in d["title"].lower() or q in d["desc"].lower()]
    if not hits:
        return f"No doc matches for {query!r}. {len(DOCS)} docs indexed."
    return "\n".join(f"- {d['title']} — {d['desc']}\n  {d['url']}" for d in hits[:25])


@mcp.tool()
def get_doc(url: str) -> str:
    """Fetch a Carbon documentation page (must be a carbondesignsystem.com URL) and return readable text."""
    if "carbondesignsystem.com" not in url:
        return "Only carbondesignsystem.com URLs are allowed."
    req = urllib.request.Request(url, headers={"User-Agent": "carbon-mcp/0.1"})
    html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
    html = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
    html = re.sub(r"<style.*?</style>", " ", html, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", html)
    import html as _h
    text = re.sub(r"[ \t]+", " ", _h.unescape(text))
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text[:8000]


if __name__ == "__main__":
    mcp.run()
