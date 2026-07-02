# carbon-mcp — local Carbon Design System MCP

Local MCP server exposing **real** IBM Carbon Design System data — no IBM token / OAuth needed
(the official hosted Carbon MCP requires IBMid credentials). Data is extracted from the installed
`@carbon/*` npm packages plus the public `llms.txt` doc index.

## Data sources (all real, not hand-written)
- `corpus/components.json` — 221 web components from `@carbon/web-components/custom-elements.json`
- `corpus/themes.json` — white / g10 / g90 / g100 theme tokens from `@carbon/themes`
- `corpus/colors.json` — full palette from `@carbon/colors`
- `corpus/tokens.json` — spacing/breakpoints + type from `@carbon/layout` + `@carbon/type`
- `corpus/docs-index.json` — 118 doc pages from `carbondesignsystem.com/llms.txt`

## Tools
- `list_components(query?)` — list cds-* components
- `get_component(tag)` — full attributes + allowed values + properties for one component
- `get_tokens(category, theme?)` — `theme` (white|g10|g90|g100) | `color` | `layout` | `type`
- `search_docs(query)` — search the doc index
- `get_doc(url)` — fetch + strip a carbondesignsystem.com page live

## Registered with Claude Code (user scope)
```
claude mcp add carbon --scope user -- ./.venv/bin/python ./server.py
```
Restart Claude Code for the `carbon` tools to appear in-session.

## Maintenance
`./refresh.sh` — re-pull latest @carbon packages and rebuild the corpus.
