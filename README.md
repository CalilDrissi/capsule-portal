# Capsule — Accounting Document Portal

A multi-firm SaaS accounting portal built on a fork of **Mayan EDMS** (Django, `mayan-edms/`)
plus a **React + IBM Carbon** SPA (`capsule-web/`) that consumes Mayan's REST API.

- `mayan-edms/` — Mayan fork. Our tenancy app lives in `mayan-edms/mayan/apps/capsule_org/`.
- `capsule-web/` — Vite + React + TypeScript SPA. Dev server on **:5180**.
- `carbon-mcp/` — (optional) Carbon Design MCP server used during development.

The Mayan API runs in Docker (all-in-one profile) and is published on **:8800**.
The SPA talks to it via `VITE_API_BASE` and a dev `/api` proxy — both point at `localhost:8800`.

---

## Prerequisites (macOS)

- **Docker Desktop** (Apple Silicon: keep "Use Rosetta for x86/amd64 emulation" enabled —
  the Mayan image is amd64-only; `docker-compose.capsule.yml` sets `platform: linux/amd64`).
- **Node.js 20+** (`brew install node`) for the SPA.

## 1. Start the Mayan backend (Docker)

```bash
cd mayan-edms/docker
docker compose -f docker-compose.yml -f docker-compose.capsule.yml --profile all_in_one up -d
```

First run pulls images + initializes the DB (a few minutes). Watch it come up:

```bash
docker compose -f docker-compose.yml -f docker-compose.capsule.yml logs -f app
```

The API is ready when `http://localhost:8800/api/v4/` responds. Create the platform admin:

```bash
docker compose -f docker-compose.yml -f docker-compose.capsule.yml exec app \
  /opt/mayan-edms/bin/mayan-edms.py createsuperuser
```

Apply the capsule_org migrations (usually automatic on boot; run explicitly if needed):

```bash
docker compose -f docker-compose.yml -f docker-compose.capsule.yml exec app \
  /opt/mayan-edms/bin/mayan-edms.py migrate capsule_org
```

## 2. Start the SPA

```bash
cd capsule-web
npm install
npm run dev          # http://localhost:5180
```

Open **http://localhost:5180** and sign in with the superuser you created.

---

## Dev loop cheatsheet

Run all commands from `mayan-edms/docker/`. Prefix is long, so alias it:

```bash
alias dc='docker compose -f docker-compose.yml -f docker-compose.capsule.yml'
dc --profile all_in_one up -d      # start
dc logs -f app                     # tail
dc restart app                     # RELOAD after editing backend Python
dc exec app /opt/mayan-edms/bin/mayan-edms.py <manage-cmd>
dc down                            # stop (keeps data volumes)
```

- The `mayan/` source is bind-mounted **read-write** into the container, so `makemigrations`
  writes migration files back to the host and code edits need only an `app` restart.
- **Firm users must be non-staff / non-superuser** — staff/superuser bypass all ACLs and break
  tenant isolation. The platform admin (superuser) is the only staff account.

## Fresh test data

Test firms/clients/documents live in the Postgres Docker volume and do **not** travel with git.
Re-provision on a new machine via the accountant UI (create firm → create clients → invite links),
or the `capsule_org` provisioning services.

## Regression tests (headed Playwright)

```bash
cd capsule-web
DISPLAY=:0 node test_foundation.mjs     # + test_features, test_p4_flow, etc.
```

---

## Notes

- Upstream Mayan remote (the fork's origin before flattening for this repo):
  `https://gitlab.com/mayan-edms/mayan-edms.git`. Re-add with
  `git remote add upstream https://gitlab.com/mayan-edms/mayan-edms.git` if you want to pull core updates.
- `docker/.env` and `capsule-web/.env` are committed on purpose (dev-only config, no production secrets).
