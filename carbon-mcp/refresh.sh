#!/usr/bin/env bash
# Re-pull latest @carbon/* packages + rebuild the real-data corpus.
# Run after Carbon releases to keep the MCP data current.
set -e
cd "$(dirname "$0")"
npm install --no-audit --no-fund @carbon/web-components @carbon/themes @carbon/colors @carbon/layout @carbon/type
node extract.js
curl -s "https://carbondesignsystem.com/llms.txt" -o corpus/llms.txt
.venv/bin/python - <<'PY'
import re, json
txt=open('corpus/llms.txt').read()
items=[{"title":m.group(1).strip(),"url":m.group(2).strip(),"desc":m.group(3).strip()}
       for m in re.finditer(r'\[([^\]]+)\]\((https?://[^)]+)\):\s*(.*)', txt)]
json.dump({"source":"carbondesignsystem.com/llms.txt","count":len(items),"docs":items},
          open('corpus/docs-index.json','w'), indent=2)
print(f"docs-index.json: {len(items)} entries")
PY
echo "corpus refreshed."
