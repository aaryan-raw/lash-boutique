# Browser end-to-end suite

Drives a real headless Chrome against a production build (`npm run build && npm start -- -p 3111`) backed by a **throwaway local Postgres**.
It never contacts Razorpay: `rzp-stub.mjs` is a local stand-in for the Razorpay *API*, and `journey.mjs` replaces the hosted checkout *widget* with a stub that signs callbacks using the test secret. It therefore tests this app's server-side verification, not Razorpay itself.

1. Create an empty local database, then `cp e2e/e2e.env.example e2e/e2e.env`, fill the hash, and `source e2e/e2e.env`.
2. `npm run db:migrate && npm run db:seed-dev`, then `npm run build && npm start -- -p 3111`.
3. `node e2e/rzp-stub.mjs &` then `cd e2e && npm install`.
4. `node sweep.mjs` (15 pages x 5 widths, axe, overflow, images), `node journey.mjs` (customer, payment, failure, admin), `node quality.mjs` (keyboard, SEO, security, performance). Re-seed (truncate tables, `npm run db:seed-dev`) before `journey.mjs`; run `quality.mjs` after it.
5. Set `CHROME_PATH` to a local Chrome if the bundled Chromium does not run on your OS. Screenshots go to `e2e/shots/`.
The scripts contain throwaway fixture credentials for the local test database only.
