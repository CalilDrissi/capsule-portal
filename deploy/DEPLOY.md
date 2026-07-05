# Capsule — Production Deployment (single VPS, HTTPS)

One Ubuntu VPS runs the whole stack behind **Caddy** (automatic Let's Encrypt TLS):

```
Internet ──443──> Caddy ──┬── /            → SPA static files (capsule-web/dist)
                          └── /api,/static,/admin,/media,/favicon.ico → app:8000 (Mayan)
                                   app ── Postgres 15 · Redis · RabbitMQ  (internal net)
```

SPA and API are **same-origin** (the SPA calls the relative path `/api/v4`), so there
are no CORS round-trips in normal use.

---

## 1. DNS

Point an **A record** for your domain at the server's public IP and wait for it to
resolve (`dig +short your.domain.com`). Let's Encrypt validates over HTTP/TLS on
ports 80/443, so this must be correct *before* you bring the stack up.

## 2. Install Docker (Ubuntu)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"    # log out/in so the group applies
docker compose version             # confirm Compose v2
```

## 3. Firewall — allow only 22, 80, 443

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Postgres/Redis/RabbitMQ and the Mayan app port are **never** published to the host —
they live on the internal `mayan` Docker network only.

## 4. Clone the repo

```bash
git clone <your-repo-url> capsule
cd capsule
```

All commands below run from this repo root.

## 5. Fill in secrets

```bash
cp deploy/.env.prod.example deploy/.env.prod
```

Generate strong values and edit `deploy/.env.prod`:

```bash
openssl rand -base64 50   # -> MAYAN_SECRET_KEY
openssl rand -hex 32      # -> MAYAN_DATABASE_PASSWORD
openssl rand -hex 32      # -> MAYAN_RABBITMQ_PASSWORD
openssl rand -hex 32      # -> MAYAN_REDIS_PASSWORD
```

Set `CAPSULE_DOMAIN`, `CAPSULE_ACME_EMAIL`, and replace `your.domain.com` in
`MAYAN_ALLOWED_HOSTS`, `MAYAN_CORS_ALLOWED_ORIGINS`, `MAYAN_CSRF_TRUSTED_ORIGINS`.
`deploy/.env.prod` is gitignored — never commit it.

## 6. Build the SPA

The SPA must be built against the same-origin API path so it calls `/api/v4`:

```bash
cd capsule-web
VITE_API_BASE=/api/v4 npm ci
VITE_API_BASE=/api/v4 npm run build   # -> capsule-web/dist  (served by Caddy)
cd ..
```

Rebuild and just restart Caddy whenever the frontend changes (no image rebuild needed).

## 7. Bring up the stack

```bash
docker compose \
  -f mayan-edms/docker/docker-compose.yml \
  -f deploy/docker-compose.prod.yml \
  --env-file deploy/.env.prod \
  --profile all_in_one up -d --build
```

This builds `deploy/Dockerfile.capsule` (Mayan s4.11 + capsule_org baked in) and
starts app + Postgres + Redis + RabbitMQ + Caddy. First boot pulls images,
initializes the DB, and Caddy fetches a certificate (a minute or two).

Watch it come up:

```bash
docker compose -f mayan-edms/docker/docker-compose.yml -f deploy/docker-compose.prod.yml logs -f app caddy
```

The site is ready when `https://your.domain.com/` serves the SPA and
`https://your.domain.com/api/v4/` responds.

## 8. Migrations + platform admin

Migrations (including `capsule_org`) normally run automatically on first boot.
Run explicitly if needed, then create the platform superuser:

```bash
DC="docker compose -f mayan-edms/docker/docker-compose.yml -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

$DC exec app /opt/mayan-edms/bin/mayan-edms.py migrate
$DC exec app /opt/mayan-edms/bin/mayan-edms.py createsuperuser
```

## 9. Provision the first firm

Sign in at `https://your.domain.com/` as the superuser and use the accountant UI to
create the first firm → clients → invite links (or call the `capsule_org`
provisioning services / API directly).

> **CRITICAL — tenant isolation:** firm users MUST be **non-staff / non-superuser**.
> Staff/superuser accounts bypass all ACLs and break tenant isolation. The platform
> admin created in step 8 is the *only* staff/superuser account. Never grant firm
> users `is_staff` or `is_superuser`.

---

## Before you open *public* signup (pilot → GA hardening)

The stack above is safe for a **monitored pilot** (you provision the firms, you watch
the logs). Add these before exposing an open, unattended signup to the internet:

### a. Login brute-force protection
Baseline is already present: the API throttles anonymous requests. For real
account-lockout, the simplest host-level control (no app changes) is **fail2ban**
watching Caddy's access log for repeated failed token requests:

```bash
sudo apt-get install -y fail2ban
```

Add a filter matching `POST /api/v4/auth/token/obtain/` responses with status `400`
in the Caddy JSON access log, and a jail that bans the source IP after ~10 failures
in 10 minutes. (Caddy must log access to a file the jail reads — add a `log` block to
the Caddyfile pointing at `/var/log/caddy/access.log` and mount it to the host.)

For **per-account lockout** (not just per-IP), integrate
[`django-axes`](https://django-axes.readthedocs.io): `pip install django-axes` in
`deploy/Dockerfile.capsule`, then add `axes` to `INSTALLED_APPS`, its middleware, and
`AxesStandaloneBackend` as the first `AUTHENTICATION_BACKENDS` entry. This requires a
small Mayan settings patch (these aren't all exposed as `MAYAN_*` env vars), so it's a
code change, not config — do it deliberately and run its migrations.

### b. Multi-factor auth for accountants
Accountants hold access to every client's financial documents. Add TOTP MFA
(e.g. `django-otp`) for accountant/admin logins before GA.

### c. Automate backups (don't rely on manual snapshots)
Cron a nightly `pg_dump` **off-box** plus a snapshot of the `mayan_app` volume
(documents + the generated secret key live there):

```bash
DC="docker compose -f mayan-edms/docker/docker-compose.yml -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"
$DC exec -T app pg_dump ... > backup-$(date +%F).sql   # ship this off the server
```

### d. Scale-out for large firms
Period **export** streams files into the zip and is memory-bounded, and the settings
**index rebuild** is failure-guarded — both fine for pilot-scale data. For firms with
thousands of documents, move these two operations to Celery tasks (the workers already
run in the all-in-one container) so they don't hold an HTTP request open.

---

## Operations

```bash
DC="docker compose -f mayan-edms/docker/docker-compose.yml -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

$DC ps                     # status
$DC logs -f app            # tail app
$DC pull && $DC up -d      # update base images
$DC down                   # stop (data volumes preserved)
```

- **Backend code change (capsule_org):** it is baked into the image — re-run the
  step 7 command with `--build` to rebuild `capsule-mayan:prod`.
- **Frontend change:** rebuild the SPA (step 6), then `$DC restart caddy`.
- **Config validation without starting anything:**
  `$DC config >/dev/null` (parses + merges the two compose files).

## Notes / decisions for the operator

- **`/admin` exposure:** the Django admin is proxied by default (Caddyfile
  `@backend` matcher). To hide it, delete `/admin*` from that line and
  `$DC restart caddy`.
- **Elasticsearch:** not enabled (Mayan's default search works). To enable, add
  `,elasticsearch` to the profiles and set `MAYAN_ELASTICSEARCH_PASSWORD`.
- **Backups:** back up the Docker volumes — `mayan_app` (documents) and
  `mayan_postgres` (database) — regularly.
