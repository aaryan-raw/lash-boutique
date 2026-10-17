# Pre-launch checklist, search setup and sales measurement

## A. Completed and verified (test environment only)
- [x] Responsive layouts at 320/360/390/768/1024/1440 px on 15 public pages, plus admin, order and checkout pages: no horizontal overflow, one h1 per page, no broken images.
- [x] axe-core WCAG 2.1 A/AA and best-practice checks: no violations on all tested pages. Keyboard: skip link, visible focus on 18 consecutive tab stops, mobile menu (Enter/Escape), size selector. Reduced-motion respected. Contrast measured; one failing gold text colour fixed.
- [x] Full customer journey in a real browser: browse, search, filter, sort, gallery, size select, cart totals and persistence, checkout validation, COD order, duplicate-click protection, order confirmation without personal data.
- [x] Online payment logic (against a local stand-in for Razorpay): server-side order creation, signed-callback verification, forged signature rejected, abandoned payment held then expired, retry, webhook signature check, amount check, late payment after cancellation flagged.
- [x] Inventory: reservation, last-unit race (one winner), restock on cancel, sold-out and inactive products blocked, manipulated requests rejected.
- [x] Admin: server-side authorization on every route/page, forged/expired sessions rejected, CSRF checks, product create/edit/archive/publish, shipping settings, order status workflow with logging.
- [x] Secrets scan of every client file and HTML response: clean. Server log contains no customer data or secrets. Security headers set; `x-powered-by` removed.
- [x] SEO: unique titles/descriptions, canonical URLs, Open Graph, sitemap, robots, custom 404, structured data (LocalBusiness with verified name/address/phone only; Product only for real products using database price and stock).
- [x] Performance (lab, this sandbox): cold home page ~145 kB JS (compressed), FCP ~130-160 ms unthrottled / ~530-580 ms with Slow-4G + 4x CPU throttling, CLS 0.001 to 0.036. These are lab numbers, not field data or a Lighthouse score.
- [x] CI workflow, Netlify config, lockfile, clean-install build.
- [x] Dependency security: framework upgraded to Next.js 16.4.2 after `npm audit` showed open advisories on 14.x/15.x; production audit reports 0 vulnerabilities. One dev-tooling advisory (`braces` via Tailwind 3) remains; see README.

## B. Pending: needs the owner or an external account (not done, not claimed)
- [ ] Real catalogue: products, prices, sizes, stock, **photography** (all current images are labelled placeholders).
- [ ] Policy text: shipping, returns/exchange, cancellation, privacy, terms. Pages show placeholders and **must not go live unfilled**.
- [ ] Opening hours, brand story, approved customer reviews and a Google review link. The 4.7/968 rating is owner-supplied and unverified; the structured data deliberately omits it.
- [ ] Razorpay account/KYC, live keys, webhook configured, and a **test-key payment run on the deployed site** (not yet done against real Razorpay).
- [ ] Decide whether cash on delivery is offered (`ENABLE_COD`).
- [ ] Shipping charge, free-shipping rule and delivery PIN areas entered in admin. Courier choice (tracking is manual).
- [ ] Database hosted, migrated, backed up. Admin credentials created.
- [ ] Domain decision and control (`thelashonline.com` showed unrelated content); DNS change; HTTPS.
- [ ] Deploy to a Netlify preview and verify (never deployed). Push to GitHub (nothing pushed).
- [ ] Logo/brand mark (a plain placeholder favicon is included), social links, Open Graph share image.
- [ ] Order email provider (optional) and test.
- [ ] Browser testing on real phones and Safari/Firefox (only headless Chrome was used).
- [ ] Set `NEXT_PUBLIC_SITE_URL`, `ALLOW_INDEXING=true`, `SHOW_DRAFT_NOTICES=false` at launch.
- [ ] Legal review of privacy/terms and consent wording (you are collecting names, phone numbers and addresses).

## C. Google Search Console and Business Profile
Do these **after** the site is live on its final domain with `ALLOW_INDEXING=true`. Rankings cannot be guaranteed.
1. Search Console > Add property > *Domain* (verify with a DNS TXT record at your registrar) or *URL prefix* (verify with the HTML tag/file method).
2. Sitemaps > submit `https://<domain>/sitemap.xml`. Use URL Inspection > Request indexing for the home page, each category and a few products.
3. Google Business Profile: find the existing listing for the shop, **claim/verify** it (video, phone or postcard), and make the name, address and phone match the site footer exactly (Lash Boutique, Opposite CSI Church Auditorium, Kannammoola, Thiruvananthapuram 695011, +91 99957 82624). Set the website field to the live URL, add categories, hours and photos.
4. Check Search Console > Pages and Enhancements for indexing or structured-data errors weekly for the first month.
5. Write real product descriptions (fabric, fit, occasion) in plain language; avoid repeating keywords.

## D. Measuring sales after launch
No web analytics is installed yet (a privacy/consent decision is needed first). Until then, measure from your own data:
1. **Weekly** run `db/reports.sql`: orders and revenue, average order value, online vs COD mix, cancellation/return rate, best sellers, low stock, orders needing attention, repeat customers.
2. Reconcile online revenue with the Razorpay dashboard monthly.
3. Track WhatsApp enquiries by counting chats that start with "I would like to ask about:" (the prefilled text) and note how many become orders.
4. Add a privacy-respecting analytics tool (for example Plausible or GA4 with a consent banner) to see visits, product views, add-to-cart and checkout drop-off; then review conversion rate (orders / visits) monthly.
5. Set targets only after 4 to 8 weeks of real data; compare week over week, not against guesses.
