# Deployment and rollback

## What the host must support
This is **not a static site**. It needs a server runtime for: server-rendered pages that read Postgres, API routes (`/api/checkout`, `/api/checkout/verify`, `/api/webhooks/razorpay`, `/api/admin/*`), and an outbound connection to Postgres and Razorpay. Plain static hosting cannot run it. Verified here: `next build` + `next start` (Next.js 16.4.2) on Node 22 with a real Postgres. **Not verified: an actual Netlify deploy, or that Netlify's Next.js runtime supports this Next 16 release; check Netlify's current Next.js support notes before relying on it.** If it does not, host on any Node server or another Next-capable platform.

## Netlify (config provided, never deployed)
Files: `netlify.toml` (build command, Node 22), `netlify/functions/expire-pending.mjs` (every 10 minutes), `.nvmrc`. Netlify detects Next.js and runs it on its Next runtime.
1. Push the project to GitHub yourself (nothing was pushed). Create a Netlify site from that repo.
2. Add environment variables (Site settings > Environment variables) from the README table. Mark secrets as secret. Set `NEXT_PUBLIC_SITE_URL` to the site's final HTTPS URL **before the first production build** (it is read at build time).
3. Database: create a Postgres DB, use its **pooled** connection string, run `npm run db:migrate` once from your machine with `DATABASE_URL` set.
4. Deploy to a preview URL first. Verify: storefront loads, `/admin/login` signs in, Shipping saved, a **test-key** order completes, the webhook shows 200 in Razorpay, the scheduled function runs (Netlify > Functions > Logs).
5. Confirm before launch that serverless limits suit you: each checkout/webhook request is a short function call; `DATABASE_POOL_MAX` defaults to 1 per instance to protect DB connections. If you see timeouts or connection errors, use a pooled DB URL or host on a plain Node server (`npm run build && npm start`), which is the configuration tested here.
6. Launch: attach the domain (DNS change is yours to make), set `ALLOW_INDEXING=true` and `SHOW_DRAFT_NOTICES=false`, redeploy.
Any Node host (VPS, Render, Railway, Fly) also works with `npm ci && npm run build && npm start`; you must then run the expiry call yourself (cron hitting the endpoint).

## Domain note
`thelashonline.com` was serving unrelated gambling content when inspected at the start of this project. Confirm you control it, clean or recover it, and check Google Safe Browsing before pointing it at this site, or launch on a fresh domain.

## Rollback
- **Code:** Netlify > Deploys > pick the last good deploy > *Publish deploy*. Takes effect immediately. The schema is additive and idempotent, so an older build still works with the current database.
- **Emergency stop for orders:** remove `RAZORPAY_KEY_ID` and set `ENABLE_COD` to `false` (or delete both) and redeploy/restart. Checkout then shows "not available" and the API returns 503; browsing and WhatsApp/phone contact keep working. Orders already placed are untouched.
- **Data:** take a Postgres backup (your provider's point-in-time recovery or `pg_dump`) before every schema change and before launch. Never run `db:seed-dev` against production (it refuses when `NODE_ENV=production`).
- **Payments:** if a payment succeeds while the site is down, the Razorpay webhook retries; confirm in Razorpay that deliveries show 200 after recovery and reconcile `db/reports.sql` query 6.
