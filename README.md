# AFRICAN VIBES

A production-quality event discovery, ticketing and management platform for
African football, culture, music and nightlife. Built as a responsive
Progressive Web App with a typed API, database-backed bookings, digital QR
tickets and an admin dashboard.

> **Build status: Phase 9 complete** — design system, app shell, home page,
> the ticket-selection → attendee-details → review booking flow, a PostgreSQL
> (Drizzle) data layer with email + password accounts (including email
> verification and password reset), checkout with server-verified, idempotent
> payment processing (mock + Stripe), digital QR tickets with a staff check-in
> desk, a My Tickets booking history, a role-protected admin dashboard for
> events, ticket types, bookings, promo codes, gallery media and newsletter
> subscribers, transactional email (booking confirmations, verification,
> password reset, newsletter welcome), CSV reporting, a production security
> review (strict config validation, hardened CORS/helmet, timing-safe login) and
> single-origin deployment. See [Build phases](#build-phases) below.

---

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Frontend   | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + PWA plugin |
| Routing    | React Router 7                                                |
| Backend    | Node.js + Express 5 + TypeScript (ESM)                        |
| Database   | PostgreSQL with Drizzle ORM + SQL migrations                  |
| Payments   | Stripe (test mode) with a fully local mock fallback           |
| Auth       | Email + password, JWT access/refresh tokens, bcrypt hashing   |

The repository is an npm workspaces monorepo:

```
.
├── client/          # React PWA
├── server/          # Express API
├── scripts/db.sh    # local PostgreSQL helper (no Docker, no root)
├── docs/            # design reference
└── .env             # server secrets (git-ignored)
```

---

## Prerequisites

- Node.js 20+ (developed on Node 24)
- PostgreSQL 18 binaries available on the machine (`initdb`, `pg_ctl`, `psql`)

No Docker or root access is required — `scripts/db.sh` runs a user-owned
PostgreSQL cluster inside `./.pgdata` on port **5433**.

---

## Getting started

```bash
# 1. Install all workspace dependencies
npm install

# 2. Create the server environment file
cp .env.example .env
#    then edit .env (see "Environment variables" below)

# 3. Create and start the local database
scripts/db.sh init          # first run creates the cluster + database
scripts/db.sh start         # later runs just start it

# 4. Apply migrations and load seed data (event, tickets, promos, demo users)
npm run db:migrate
npm run db:seed

# 5. Run the client and API together
npm run dev
#    client → http://localhost:5173
#    API    → http://localhost:4000
```

Useful scripts (run from the repository root):

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Run client + API together                |
| `npm run dev:client` | Run the web client only                  |
| `npm run dev:server` | Run the API only                         |
| `npm run build`      | Type-check and build both workspaces     |
| `npm run typecheck`  | Type-check both workspaces               |
| `npm run db:generate`| Generate a Drizzle migration from schema |
| `npm run db:migrate` | Apply pending migrations                 |
| `npm run db:seed`    | Seed the event, promos and demo accounts  |
| `scripts/db.sh psql` | Open a psql shell on the local database  |
| `scripts/db.sh reset`| Delete and recreate the local cluster    |

---

## Environment variables

Server secrets live in the repo-root `.env` (copy of `.env.example`). The client
reads `.env` (Vite only exposes `VITE_`-prefixed values). All secrets stay on the
server — none are exposed to the browser.

Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 32`
- `PAYMENTS_MODE` — `mock` (local sandbox) or `stripe`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CLIENT_ORIGIN`, `BASE_URL`, `PORT`
- `DEFAULT_CURRENCY`, `DEFAULT_TIMEZONE`
- `EMAIL_FROM`, `RESEND_API_KEY` — outbound email sender and provider
- `UPLOAD_DIR` — disk directory for uploaded gallery images (default `server/uploads`)

### Integrations that need your credentials

- **Stripe**: the app runs end-to-end in `PAYMENTS_MODE=mock` with no keys. To
  use real Stripe **test mode**, add `sk_test_…`, `pk_test_…` and a webhook
  signing secret, then set `PAYMENTS_MODE=stripe`.
- **Email**: transactional and newsletter mail sends through
  [Resend](https://resend.com) when `RESEND_API_KEY` is set. Leave it blank in
  development to log the full message to the server console instead. Set
  `EMAIL_FROM` to a sender verified with your provider.

---

## Build phases

1. **Design system + home page** ✅ — brand tokens, glass components,
   navigation (all 9 sections), hero, live event countdown, categories,
   highlights, "why attend", newsletter.
2. **Event details + ticket selection flow** ✅ — event detail pages, a
   server-authoritative quote endpoint (`POST /api/quote`) for pricing,
   inventory and promotional codes, and the 3-step booking flow (`/tickets`,
   `/checkout/details`, `/checkout/review`) with attendee capture and
   validation.
3. **Database (Drizzle migrations) + authentication** ✅ — PostgreSQL schema
   for events, ticket types, promos, users and refresh tokens; migrations and
   an idempotent seed script; email + password accounts with bcrypt hashing,
   short-lived JWT access tokens and rotating, hashed refresh tokens stored in
   an httpOnly cookie.
4. **Checkout + verified payment processing** ✅ — bookings and attendees are
   persisted to PostgreSQL with a generated `AV-…` reference and an opaque
   access token; the server re-quotes every order authoritatively and fulfils
   payment inside a single transaction (inventory is decremented once, even on
   webhook retries). Supports a local **mock** provider and **Stripe** hosted
   Checkout with signature-verified, idempotent webhooks.
5. **Digital tickets + QR validation + check-in** ✅ — every attendee gets a
   unique QR ticket rendered in the browser; a staff-only check-in desk
   (`/admin/check-in`) validates codes by camera scan or manual entry and marks
   them used, with idempotent, race-safe check-in.
6. **My Tickets + booking history** ✅ — a signed-in ticket hub listing every
   booking (upcoming and past) with status, totals and QR tickets; guests can
   claim a booking to their account with its reference and access token.
7. **Admin dashboard + event/ticket/booking management** ✅ — a role-protected
   admin area (`/admin`) with live stats, an events list and editor (details,
   venue, fees, ticket types with capacity/remaining), booking search/filter and
   detail views with refund/cancel that restore inventory, and promo-code
   management.
8. **Gallery, newsletter, notifications** ✅ — a public gallery
   (`/gallery`) fed by admin-managed media with a dependency-free upload
   endpoint (base64 → local disk, served from `/uploads`) or pasted URLs; a
   newsletter sign-up with a tokenised unsubscribe link and an admin
   subscribers list; and transactional email (booking confirmations, email
   verification, password reset, newsletter welcome) via Resend or a console
   fallback.
9. **Reporting, security review, accessibility, deployment** ✅ — an admin
   Reports page (`/admin/reports`) with a daily-revenue chart, per-event
   performance (sell-through, revenue, check-ins), a ticket-type breakdown and
   authenticated CSV exports for bookings and subscribers. A production
   security pass (fail-fast config validation, hardened CORS/helmet/CSP,
   trusted proxy support, a global API rate limit and timing-safe login) plus
   targeted accessibility fixes (skip link, dialog focus management, live
   regions). The API can serve the built SPA from one origin for deployment.

### Notes on the current build

- Events, ticket types and promotional codes live in PostgreSQL and are served
  by the API. When the database is unavailable the API falls back to the
  bundled seed (`server/src/domain/eventSeed.ts`) so the UI is always
  renderable. Admins now manage events, ticket types and promo codes from the
  dashboard.
- Ticket **selection, pricing, attendee details, order review and payment** are
  fully interactive. On checkout the API creates a `pending` booking, then
  fulfils it atomically once payment is confirmed — decrementing inventory and
  issuing a unique ticket code per attendee.
- Booking progress (selection, attendees, purchaser, promo code) is held in a
  React context and mirrored to `sessionStorage`, so a refresh mid-flow is
  recoverable. The in-flight booking's opaque access token is stored separately
  so its tickets can be reopened later.
- **Payments default to the local mock provider** (`PAYMENTS_MODE=mock`): the
  `/checkout/payment` page lets you simulate a successful or failed payment. To
  use real Stripe test mode, set `PAYMENTS_MODE=stripe` plus `sk_test_…`, a
  publishable key and a webhook signing secret; customers are redirected to
  Stripe-hosted checkout and the signed `checkout.session.completed` webhook
  fulfils the booking.
- **Digital QR tickets** are rendered on the booking confirmation page (one
  code per attendee). Staff and admins open the check-in desk at
  `/admin/check-in` (linked from the account page) to scan with the camera
  (`BarcodeDetector`, Chromium-based browsers) or type a code. Check-in is
  idempotent and only admits tickets whose booking is paid.
- **My Tickets** (`/my-tickets`) lists every booking linked to the signed-in
  account — upcoming and past — and opens a detail view with the QR tickets for
  paid orders. Bookings made while signed in are attached automatically; a
  guest booking is claimed with its `AV-…` reference and opaque access token.
- **The admin dashboard** lives at `/admin` (admins only; customers see an
  access notice). It shows revenue/ticket stats, manages events and their ticket
  types, searches and filters bookings, opens a booking detail with
  refund/cancel actions (inventory is restored on cancellation), and manages
  promo codes. Staff and admins also get the check-in desk at `/admin/check-in`.
- **Accounts are live** at `/account`. Sessions use a short-lived access token
  plus a rotating refresh token in an httpOnly cookie. Seed accounts:
  `admin@africanvibes.test` / `Admin123!` and `customer@africanvibes.test` /
  `Customer123!` (development only).
- **Email verification and password reset** are live: registering (or requesting
  a reset) issues a single-use, time-limited token and emails a link
  (`/verify-email`, `/reset-password`). With no `RESEND_API_KEY` configured the
  email is logged to the server console, so the flow works in development.
- **Booking confirmation emails** are sent when a booking is fulfilled (mock
  payment or the Stripe webhook), listing the reference, event details and
  ticket codes.
- **Gallery media** is managed at `/admin/gallery` (upload a file or paste a
  URL, link an event, reorder, publish/hide). The public `/gallery` page shows
  published media and falls back to Kente-inspired CSS placeholders when empty.
- **Newsletter** sign-up appears on the home page; each subscriber gets a
  welcome email and a tokenised unsubscribe link, and admins can review
  subscribers at `/admin/subscribers`.
- **Reports** live at `/admin/reports`: a daily-revenue chart (7/30/90 days),
  per-event performance, a sales-by-ticket-type breakdown and authenticated CSV
  exports of every booking and subscriber.
- **Production configuration is validated at boot.** With
  `NODE_ENV=production` the server exits immediately if `JWT_ACCESS_SECRET` /
  `JWT_REFRESH_SECRET` are still development defaults (or shorter than 32
  characters), `DATABASE_URL` is missing, the origins are still `localhost`, or
  `PAYMENTS_MODE=stripe` without the required Stripe keys.

---

## Deployment (Render)

The repo ships a [Render Blueprint](render.yaml) that provisions everything
needed to hand the client a public URL:

1. Push the repository to GitHub/GitLab. The `.env` file is git-ignored — never
   commit it.
2. In Render choose **New + → Blueprint**, select the repository, and apply.
   Render creates a PostgreSQL database and a web service, generates strong
   `JWT_*` secrets, wires `DATABASE_URL`, runs migrations during the build and
   starts the API — which also serves the built SPA on the same origin.
3. Watch the first deploy, then open the service URL. `BASE_URL` and
   `CLIENT_ORIGIN` are derived from Render's `RENDER_EXTERNAL_URL`, so the
   default `*.onrender.com` domain needs no extra wiring.
4. (Optional) Seed demo data from the service **Shell**:
   `SEED_DEMO_ACCOUNTS=true npm run db:seed` — this creates the demo event,
   promos and the admin/customer accounts even in production.

### Preparing the client review

- **Sign-in:** with `SEED_DEMO_ACCOUNTS=true` the demo accounts are
  `admin@africanvibes.test` / `Admin123!` (admin) and
  `customer@africanvibes.test` / `Customer123!`. The admin area is at `/admin`.
- **Payments:** `PAYMENTS_MODE=mock` lets reviewers finish checkout via the
  on-screen *simulate payment* step — no Stripe keys or real cards required.
- **Email:** without `RESEND_API_KEY`, verification/reset/newsletter emails are
  written to the Render service log rather than delivered. Demo accounts are
  pre-verified so reviewers can sign in regardless; add a Resend key and
  `EMAIL_FROM` to demonstrate real delivery.
- **Uploads:** free Render services have an ephemeral filesystem, so uploaded
  gallery images are lost on redeploy. Uncomment the `disk:` block in
  `render.yaml` (paid instance) and add `UPLOAD_DIR=/var/data/uploads`, or use
  pasted image URLs.
- **Free-tier notes:** free web services sleep after inactivity (the first
  request is slow) and free PostgreSQL is time-limited — fine for a short
  review, but upgrade the plans for anything longer-lived.

### Manual / other hosts

The API and the built SPA can also be served from a single origin manually:

```bash
# 1. Build both workspaces
npm run build              # → client/dist and server/dist

# 2. Point .env at your production database and origins
#    NODE_ENV=production
#    BASE_URL=https://api.example.com
#    CLIENT_ORIGIN=https://example.com
#    DATABASE_URL=postgresql://…   JWT_ACCESS_SECRET=…   JWT_REFRESH_SECRET=…

# 3. Apply migrations, then start the API (it also serves client/dist)
npm run db:migrate
node server/dist/index.js
```

In production the server trusts the first proxy hop (set `TRUST_PROXY=false` if
it is exposed directly), serves `client/dist` with immutable caching for hashed
assets and a no-cache `index.html`, and returns the SPA shell for client-side
routes while `/api/*` and `/uploads/*` stay on the API. Set `SERVE_CLIENT=false`
to keep the client on a separate host (then CORS uses `CLIENT_ORIGIN`).

---

## Security principles

- No card data is ever stored; payments are delegated to Stripe.
- Secrets stay server-side; the client only receives public config.
- Passwords are hashed with bcrypt; refresh tokens are persisted only as
  SHA-256 hashes and rotated on every use. Access tokens are short-lived.
- Auth endpoints are rate-limited and all request bodies are validated with Zod.
  A broad, generous limit also covers the whole `/api` surface as defence in
  depth.
- Login performs a bcrypt comparison even for unknown emails, so response timing
  cannot be used to enumerate accounts.
- Helmet sets a strict Content-Security-Policy (self-only scripts, Google Fonts
  for styles/fonts, no framing) and CORS is locked to `CLIENT_ORIGIN` with an
  explicit method and header allow-list.
- In production the server refuses to start with development-default secrets,
  missing database configuration or localhost origins, and supports a trusted
  reverse proxy so client IPs (and rate limits) remain correct.
- Email-verification and password-reset tokens are single-use, time-limited and
  persisted only as SHA-256 hashes; `forgot-password` always responds the same
  way so it cannot be used to enumerate accounts.
- Gallery uploads are admin-only, restricted to PNG/JPEG/WebP/GIF data URLs up
  to 6 MB, and written to a git-ignored directory served read-only from
  `/uploads`.
- Payment fulfilment is idempotent and transactional: a booking is marked paid
  and inventory decremented at most once, even if a webhook is retried or a mock
  confirmation is replayed. Booking access is gated by an opaque token whose
  SHA-256 hash (never the raw value) is stored.
- The design reference image is at `docs/design-reference.jpeg`.

---

## Design reference

The supplied screenshot was not viewable in the build environment (the tooling
could not read the image), so the interface was built from the written
specification and the existing dark-and-gold visual identity.
