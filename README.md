# ADIFY — Events and ceremonies across Africa

Public event and ceremony discovery, publishing and booking-request platform.
Built from `specification/` (`Homepage.md`, `dashboard.md`, `tools.md`, `changes.md`).

## Quick start

```bash
cp .env.example .env.local   # fill in DATABASE_URL (Neon) + SMTP for full service
npm install
npm run db:check             # validate Neon connectivity
npm run db:migrate           # apply schema migrations
npm run dev                  # http://localhost:3000
```

Useful commands:

```bash
npm test             # maintained suite (node:test + tsx)
npm run lint         # configured ESLint gate
npm run build        # production build
npm start            # serve the production build
npm run db:check     # validate DATABASE_URL + Neon connectivity (no writes)
npm run db:status    # migration state, pending list, row counts
npm run db:migrate   # apply pending migrations (strict, history-tracked)
npm run db:verify    # verify live schema vs scripts/schema.mjs
npm run db:push      # dry-run schema diff; --apply converges via migrations (never drops)
npm run email:check  # validate SMTP config + connectivity (sends nothing)
npm run email:test -- --to=you@example.com   # send one real test email
npm run notify:process                       # deliver due outbox jobs (cron-safe)
```

## How it works

- **Homepage (`/`):** live discovery only — Happening Now, Coming Up, Near You
  (manual country cookie, never geolocation), Explore by Category, Explore
  Across Africa. Sections render only when matching published listings exist.
  Search + combinable filters run against server-side queries with pagination.
- **Discovery (`/discover`) and details (`/events/[id]`):** full filtered
  browsing; details pages show schedule, venue/online info, program, policies
  and the correct booking action computed on the server.
- **Auth (`/auth`):** split-screen register/login, password visibility,
  verification codes, password reset, safe `?next=` return targets.
- **Dashboard (`/dashboard`):** overview, bookings, organizer workspace,
  7-step event wizard (draft recovery, dynamic program/contacts), booking
  request approvals with capacity guards, notifications, profile/security,
  and a Help & Support form. The bare `/help` path redirects here.
- **API (`GET /api/events`, `GET /api/images/[id]`):** public discovery JSON
  and controlled cover serving — eligible listings and public fields only.

## Database: Neon PostgreSQL is the source of truth

Backend selection is explicit — there is no silent fallback:

| Configuration | Backend |
|---|---|
| `DATABASE_URL` set | Neon PostgreSQL (production path) |
| `DATA_FILE` set | File store (test isolation) |
| `ALLOW_LOCAL_DB=true`, no `DATABASE_URL` | File store with a startup warning (offline dev only) |
| none of the above | Startup/request error: `database_unavailable` |

Migrations live in `migrations/` and apply through `npm run db:migrate`
(history table, checksums, crash-safe claims, repeat-safe). `scripts/schema.mjs`
declares the intended schema for `db:verify`/`db:push`. Production schema
changes go through reviewed migration files — no tool in this repo drops or
renames anything automatically.

## Images: database-backed, no object storage

Event covers are validated (type sniffing, 5 MB cap) and stored as `BYTEA`
rows with ownership metadata (`images` table; sidecar blob files for the
explicit local backend). They are served through `GET /api/images/[id]`,
which allows public covers of published listings and requires the owning
session otherwise. Legacy `/uploads/*` files already on disk keep working.

## Email: durable outbox + SMTP diagnostics

Every email is recorded as an idempotent outbox job before delivery is
attempted; failures stay `queued`/`retry` with exponential backoff and are
processed by `npm run notify:process` (atomic claims, safe for concurrent
workers). Booking, event and support flows never fail because SMTP is down.
SMTP identities accept canonical `SMTP_PASSWORD`/`EMAIL_FROM` names with
legacy `SMTP_PASS`/`SMTP_FROM` aliases honored.

## Implementation decisions

- **Same repository API on both backends** (`lib/repo.ts`) so behavior cannot
  diverge silently; capacity and idempotency guards are atomic in SQL.
- **Publication policy:** a listing publishes when it satisfies the
  publication requirements. Moderation states are enforced in every discovery
  query; drafts never leak to public pages or the API.
- **Money:** integer minor units end to end (`price_amount_minor`); the old
  float column is retained read-only. Currencies come from the
  world-countries dataset with a searchable selector.
- **PWA:** hand-rolled service worker + manifest implementing
  Serwist-equivalent caching rules (static cache-first, navigations
  network-first with offline fallback; `/dashboard`, `/auth`, `/api` never
  cached).
- **Covers:** plain `<img>` with aspect-ratio boxes and lazy loading instead
  of `next/image`, because route-served image URLs need no remote config.
- **Auth:** scrypt password hashing, random opaque sessions in httpOnly
  cookies, generic login/reset messages, rate limits, single-use hashed
  codes/tokens.
- **Fonts/icons:** self-hosted Roboto, Font Awesome solid black by default.

## Environment

See `.env.example` for every variable (`.env.local`/`.env` hold real values,
never commit). Without `DATABASE_URL` the app reports `database_unavailable`
unless local development is explicitly opted in. Without `SMTP_*`, emails
stay queued in the durable outbox while in-app notifications keep working.

## Tests

`tests/` covers listing lifecycle, discovery, booking capacity + ownership,
auth, the wizard form pipeline, cover validation, minor-unit money,
currencies, outbox idempotency/retry, database images, redirects and mail
safety. Live HTTP checks could not run in this sandbox (all TCP, including
loopback, is blocked), so confirm serving with `npm run dev` and a browser
pass over register → publish → discover → book → approve.
