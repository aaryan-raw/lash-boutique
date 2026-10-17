# Lash Boutique: storefront, checkout and admin

Women's fashion boutique, Kannammoola, Thiruvananthapuram. Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS · PostgreSQL · Razorpay.

**What is and is not verified** is listed in `docs/LAUNCH-CHECKLIST.md`. In short: everything below was tested against a real local Postgres and headless Chrome, but **never against a live Razorpay account, a live Netlify deploy, a real email provider, or real products/photos**. Treat those as unverified until you run the steps in this README.

## Requirements
Node.js 22.12+ (tested on 22.22) and npm 10+. The lockfile was generated with npm 11 and verified to install with `npm ci` on npm 10.9.7. PostgreSQL 14+ for production (tested on 16; unit tests use an in-process Postgres engine, so they need no database).

## Quick start (no configuration)
```bash
npm ci
npm run dev        # http://localhost:3000
```
With no `DATABASE_URL`, the site shows a clearly-labelled **sample dataset**; checkout and admin are disabled and every sensitive endpoint fails closed. Nothing is faked.

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Develop, production build, serve the build |
| `npm run lint` / `npm run typecheck` / `npm test` | ESLint 9 (flat config), TypeScript check, 67 unit/integration tests |
| `npm run db:migrate` | Apply `lib/schema.ts` to `DATABASE_URL` (idempotent) |
| `npm run db:schema` | Regenerate `db/schema.sql` from `lib/schema.ts` |
| `npm run db:seed-dev` | Load SAMPLE products into a **development** database only (refuses in production) |
| `npm run hash-password -- '<12+ chars>'` | Produce `ADMIN_PASSWORD_HASH` |
| `e2e/` | Browser end-to-end suite (see `e2e/README.md`) |

## Environment variables (names only; see `.env.example`)
| Name | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | catalogue from DB, checkout, admin | Postgres URL; add `?sslmode=require` for hosted DBs. Use a **pooled** URL on serverless hosts |
| `DATABASE_POOL_MAX` | optional | Defaults to 1 on Netlify, 5 elsewhere |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` | admin login | Hash from `npm run hash-password`; secret 32+ random chars |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | online payment | Start with **test** keys. Secret is server-only |
| `RAZORPAY_WEBHOOK_SECRET` | payment webhook | Same value you enter in the Razorpay dashboard |
| `RAZORPAY_API_BASE` | tests only | Leave empty in production |
| `ENABLE_COD` | cash on delivery | `true` only after the owner confirms COD is offered |
| `CRON_SECRET` | expiry job | Bearer token for `/api/cron/expire-pending` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL` | optional order emails | Off unless all configured |
| `NEXT_PUBLIC_SITE_URL` | canonicals, sitemap, structured data, WhatsApp link | e.g. `https://your-domain` |
| `ALLOW_INDEXING` | launch | `true` only at launch; otherwise the site is `noindex` and robots blocks all |
| `SHOW_DRAFT_NOTICES` | launch | Set `false` once draft/pending copy is approved |

## Database
`lib/schema.ts` is the source of truth; `db/schema.sql` is generated from it (a test keeps them in sync). It is a single **idempotent** schema (`create table if not exists`), not an incremental migration history: future changes need new, additive SQL files and a note here. Tables: `products`, `variants`, `orders`, `order_items`, `order_events`, `settings`. Sales reports: `db/reports.sql`.
Hosted options: Supabase or Neon (use the pooled connection string). Never commit connection strings.

## Admin
1. Set the three admin variables, deploy, sign in at `/admin/login`.
2. **Shipping** page: set flat charge, optional free-shipping threshold and delivery PIN prefixes. **Checkout stays disabled until this is saved.**
3. **Products** page: add products (see `docs/OWNER-GUIDE.md`).
Every admin page and API checks the signed session server-side; mutations also require same-origin JSON.

## Payments (Razorpay)
1. Create a Razorpay account and complete its KYC. Use **test mode** keys first.
2. Set the key id/secret. In Razorpay Dashboard add a webhook to `https://<your-domain>/api/webhooks/razorpay` for `payment.captured` and `order.paid`, with the same secret as `RAZORPAY_WEBHOOK_SECRET`.
3. Test: place an order, pay with a Razorpay test card, confirm the order becomes `confirmed`/`paid`; close the payment window and confirm it stays `pending_payment`; cancel in admin and confirm stock returns.
4. Only then switch to live keys. Card details are entered in Razorpay's hosted widget and never reach this server. Refunds are done manually in Razorpay (the admin warns when needed).
Abandoned unpaid orders hold stock until `POST /api/cron/expire-pending` (header `Authorization: Bearer $CRON_SECRET`) runs; a Netlify scheduled function is included.

## Deployment and rollback
See `docs/DEPLOYMENT.md`.

## Project layout
`app/` pages and API routes · `components/` UI · `lib/` catalogue, pricing, orders, payments, auth, SEO, DB · `scripts/` migrate/seed/hash · `db/` SQL · `tests/` unit and integration · `e2e/` browser suite · `docs/` guides · `.github/workflows/ci.yml` CI · `netlify.toml` + `netlify/functions/` hosting.

## Dependency security
`npm audit --omit=dev` reports **0 vulnerabilities** (Next.js 16.4.2, the first release line with no open advisories at the time of writing; Next 14.x and 15.5.28 still had open ones). `npm audit` over all dependencies reports one advisory, `braces` (denial of service on crafted glob patterns) reached only through Tailwind CSS 3 build tooling; it is not part of the running site. Clearing it needs Tailwind 4 (a styling-pipeline migration, deliberately not done). Re-run `npm audit` before launch and at least monthly.

## Known limitations
No image upload (admin accepts https image URLs) · no CSV import · categories are defined in code · no coupons · no courier integration or automated tracking · no automated WhatsApp messages (click-to-chat link only) · no analytics installed · admin shares the storefront header/footer · policies, opening hours, brand story, reviews and all real photography/products are pending from the owner. Policy pages show clearly-marked placeholders and must not go live unfilled.
