# Azeel Analytics AI

Upload a CSV or Excel file and get data quality checks, statistics, charts and downloadable reports.
By Azeel Technologies.

```
azeel-analytics/
├── backend/             FastAPI · pandas · SQLAlchemy + Alembic (SQLite or PostgreSQL) · 58 tests
├── frontend/            Next.js (App Router) · TypeScript · Tailwind v4 · Recharts
│   └── e2e/             real-browser tests (19) incl. a WCAG 2.1 AA audit, and the screenshot generator
├── docker-compose.yml        local / evaluation, plain HTTP
├── docker-compose.prod.yml   public deployment: automatic HTTPS (Caddy), Redis, 2 workers
├── Caddyfile
├── .github/workflows/ci.yml  lint · tests · coverage gate · audits · browser tests · Docker smoke test
└── Makefile                  make test | lint | up | prod | backup
```

## Quick start (local)

```bash
cp .env.example .env
# set SECRET_KEY (the command is in the file)
docker compose up --build
```

Open http://localhost:3000 (API docs at http://localhost:8000/docs in this mode).

Without Docker:

```bash
# backend (Python 3.12)
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # set SECRET_KEY
uvicorn app.main:app --reload --port 8000
pytest -q --cov=app             # tests + coverage
ruff check .                    # lint

# frontend (Node 20+), in another terminal
cd frontend && cp .env.local.example .env.local
npm install && npm run dev
npm run typecheck && npm run lint && npm test     # unit/component tests
npm run build && npm run test:e2e                 # real-browser tests (needs the backend's Python deps)
```

## Deploy to production

You need a server with Docker and two DNS names pointing at it (for example
`app.example.com` and `api.example.com`). **They must share the same parent domain**: the
session cookie is `SameSite=Lax`. (For unrelated domains set `COOKIE_SAMESITE=none`.)

1. `cp .env.example .env` and set:
   `SECRET_KEY`, `SITE_URL=https://app.example.com`, `API_URL=https://api.example.com`,
   `APP_DOMAIN`, `API_DOMAIN`, `ACME_EMAIL`, `MAIL_FROM`, `CONTACT_EMAIL`, and the `SMTP_*` values.
2. `docker compose -f docker-compose.prod.yml up -d --build`
3. Visit your app URL. Certificates are issued automatically on first request.

`ENV=production` is enforced for you: the API refuses to start without a strong `SECRET_KEY`,
marks the session cookie `Secure`, sends HSTS, and turns API docs off.

> `SITE_URL`, `API_URL` and `CONTACT_EMAIL` are compiled into the frontend, so changing them
> means rebuilding (`up -d --build`).

### Before you go live

- [ ] **Set up SMTP.** Without it, password-reset and verification emails are not sent. With it,
      email verification is enforced automatically before users can upload (`REQUIRE_EMAIL_VERIFICATION=auto`).
- [ ] **Replace placeholders:** the `hello@azeel.tech` address (`CONTACT_EMAIL`), the GitHub/LinkedIn links
      in `frontend/src/components/layout/footer.tsx`, and `security@your-domain.example` in `SECURITY.md`.
- [ ] **Testimonials:** the section is hidden until you add real quotes to
      `frontend/src/content/testimonials.ts`. Nothing is invented.
- [ ] **Limits and pricing copy:** the landing page states the real enforced limits from
      `frontend/src/lib/limits.ts` (mirrors `backend/app/core/config.py`; keep them in sync). There is
      no billing, so the page offers one free tier and a "talk to us" tier.
- [ ] **Have a lawyer review `/privacy` and `/terms`.** They match what the app does but are templates.
- [ ] **Schedule backups** and copy them off the server (see Operating).

## What is built

- **Landing page:** hero with the real report layout, features with working previews, real product screenshots
  (light and dark), an in-browser demo that analyzes a CSV without uploading it, specifications, privacy,
  pricing, FAQ, contact and newsletter (stored by the API), legal pages, SEO files, light/dark theme
- **Accounts:** sign up, log in (remember me), log out, forgot/reset password and email verification by email,
  change password (signs out other devices), delete account
- **Dashboard:** file list, upload (drag and drop, validation, CSV preview, progress), data view with
  server-side search, sort and pagination, column types in plain words, missing values and duplicates,
  statistics, charts, CSV/Excel/PDF reports, settings, profile with picture
- **Charts that make sense:** bar and donut charts for categories with a few values; histograms for numeric
  columns; trend lines **only when the file has a date column** (totals for amounts, averages otherwise,
  grouped by day, month or year); ID-like columns are skipped; no chart is ever drawn empty

## Design

Typography-led and restrained: Geist (bundled, so no external font requests), hairline borders instead of
shadows, brand blue used only for actions and data, tabular figures for numbers, and the product's own
report as the main visual. Both themes are built on the brand colours (`#2563EB`, `#06B6D4`, dark `#0F172A`).

Regenerate the landing-page screenshots after UI changes:
`cd frontend && npm run build && npm run screenshots` (writes `frontend/public/screenshots/`).

## Security model

| Area | What is done |
|---|---|
| Sessions | httpOnly, `Secure`, `SameSite=Lax` cookie; no token in JavaScript or `localStorage`. Sessions are tied to the password, so changing or resetting it signs out every device |
| Passwords | bcrypt (cost 12), min 8 characters, 72-byte cap, common-password blocklist, timing-equalised login |
| CSRF | SameSite cookies plus an `Origin` allow-list on all writes |
| Abuse | Rate limits on login (per IP and per account), signup, password reset, verification, uploads, contact, plus a global per-IP cap |
| Uploads | Streamed with a hard size cap, extension + content checks, zip-bomb guard, row/column limits, per-user file and storage quotas, parsed off the event loop, random server-side filenames |
| Output | CSV/Excel formula injection neutralised, control characters stripped, PDF text escaped, download filenames sanitised |
| Transport | CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production |
| Forms | Submit buttons stay disabled until the page is interactive, so a form can never fall back to a native submit that puts a password in the URL |
| Privacy | Per-user data isolation (verified by tests), account deletion removes files, generic responses prevent account probing on reset and newsletter |

## Operating

**Migrations.** The schema is managed with Alembic and applied automatically on startup (under a
lock, so several workers can start together). Databases created before migrations existed are adopted
without data loss, and existing users are grandfathered as email-verified when upgrading. To change the
schema: edit `app/models/models.py`, then `cd backend && alembic revision --autogenerate -m "describe change"`,
review the file, commit it. A test fails if the models and migrations drift apart.

**Scaling.** Default is one backend worker. `docker-compose.prod.yml` runs two (`WEB_CONCURRENCY`) and
adds Redis so rate limits are shared between them (without `REDIS_URL` limits are per process).
If Redis is down the limiter fails open and logs, rather than taking the site down.

**Logs.** JSON lines in production (`LOG_FORMAT=text` for humans), one per request, each with a
`request_id` that is also returned as the `X-Request-ID` header, so a user-reported failure can be traced.
Health checks: `/api/health` (alive) and `/api/ready` (database reachable).

**Backups.**
```bash
docker compose exec backend python -m app.scripts.backup            # snapshot to /data/backups (keeps 14)
docker compose exec backend python -m app.scripts.backup --restore /data/backups/azeel-backup-<time>.tar.gz   # app stopped
```
The snapshot is consistent while the app is running (SQLite online backup). It lives in the same
volume, so copy it off the machine as well (`docker cp`, rsync, object storage) on a schedule, and
practise a restore before you need one. For PostgreSQL use `pg_dump` for the database.

**Quality gates (CI).** Lint; 58 backend tests with an 85% coverage gate (currently 93%); frontend
type-check, lint and 25 unit/component tests; a production build plus a check that the CSS compiled;
dependency audits (`pip-audit`, `npm audit` on production dependencies); 19 real-browser tests
(sign-up to upload to charts to downloads, session expiry, phone layout, dark mode, and an axe-core
WCAG 2.1 AA audit of every key page in both themes); and a job that builds the Docker images, starts the
stack and exercises signup, login and the backup command. Dependabot opens weekly update PRs.

## Known limits

- **Docker/Caddy and Redis were not run where this was produced.** The container files and the Redis limiter
  (tested only against an in-memory fake) are exercised by the CI `docker` job on first push. Do one trial
  run on staging before real users.
- **PostgreSQL** is supported through `DATABASE_URL` and the migrations are portable, but only SQLite was exercised.
- **Excel:** `.xlsx` only; the first sheet is analyzed.
- **CSP** allows inline scripts because Next.js injects some; per-request nonces would tighten it at
  the cost of making pages dynamic.
- **Dev tooling advisories:** `npm audit` reports issues in Vitest's own dependencies (test runner only,
  never shipped). Production dependencies audit clean.
- **Browser coverage:** the e2e suite drives Chromium only. Check Safari and Firefox by hand once.
- **No billing.** Plans are not charged or enforced beyond the account limits above.
