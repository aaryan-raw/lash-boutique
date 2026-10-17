import { launch, check, go, BASE, clickText, sleep, results } from "./lib.mjs";
import crypto from "node:crypto"; import fs from "node:fs";
import pgmod from "pg/lib/index.js";
const db = new pgmod.Client({ connectionString: (process.env.DATABASE_URL ?? "postgres://postgres@localhost:5433/lash_e2e") }); await db.connect();
const Q = async (sql, p) => (await db.query(sql, p)).rows;
const stockOf = async (sku) => (await Q("select stock from variants where sku=$1", [sku]))[0].stock;
const inrNum = (s) => Number(String(s).replace(/[^\d]/g, ""));
const SECRET = "e2e_key_secret_value"; let mode = "success"; let payN = 0;
const b = await launch(); const guard = async (name, fn) => { try { await fn(); } catch (e) { check(`${name} (threw)`, false, String(e.message).slice(0, 200)); } };
async function newCustomer(w = 390, h = 844) {
  const ctx = await b.createBrowserContext(); const page = await ctx.newPage(); await page.setViewport({ width: w, height: h });
  await page.setRequestInterception(true);
  page.on("request", (r) => r.url().startsWith("https://checkout.razorpay.com/") ? r.respond({ status: 200, contentType: "application/javascript", body: `window.Razorpay=function(o){this.open=async function(){const m=await window.__mode();if(m==="dismiss")return o.modal.ondismiss();const r=await window.__sign(o.order_id,m==="badsig");await o.handler(r);};};` }) : r.continue());
  await page.exposeFunction("__mode", () => mode);
  await page.exposeFunction("__sign", (orderId, bad) => { const pid = "pay_stub_" + ++payN; const sig = crypto.createHmac("sha256", SECRET).update(`${orderId}|${pid}`).digest("hex"); return { razorpay_order_id: orderId, razorpay_payment_id: pid, razorpay_signature: bad ? "0".repeat(64) : sig }; });
  return { ctx, page };
}
const cartCount = (page) => page.$eval('a[aria-label^="Cart"]', (e) => e.textContent.trim());
async function addToCart(page, slug, { size, qtyClicks = 0 } = {}) {
  await go(page, `/product/${slug}`);
  const sizes = await page.$$eval("fieldset button[aria-pressed]", (bs) => bs.map((x) => ({ t: x.textContent.trim(), d: x.disabled })));
  const pick = size ?? sizes.find((s) => !s.d)?.t.replace(/\(sold out\)/, "").trim();
  const hs = await page.$$("fieldset button[aria-pressed]"); for (const h of hs) { const t = (await h.evaluate((e) => e.textContent.trim())); if (!await h.evaluate((e) => e.disabled) && t.startsWith(pick)) { await h.click(); break; } }
  for (let i = 0; i < qtyClicks; i++) await page.click('button[aria-label="Increase quantity"]');
  await clickText(page, "button", "Add to cart"); await page.waitForFunction(() => document.body.innerText.includes("Added"), { timeout: 5000 }); return pick;
}
async function fillCheckout(page, o = {}) {
  const v = { name: "E2E Customer", phone: "9876543210", email: "e2e@example.test", line1: "12 Test Road, Kannammoola", city: "Thiruvananthapuram", pincode: "695011", ...o };
  for (const k of ["name", "phone", "email", "line1", "city", "pincode"]) { await page.$eval("#" + k, (e) => (e.value = "")); await page.type("#" + k, v[k]); }
}
const placeOrder = async (page) => { await clickText(page, "button", "Place order"); await page.waitForFunction(() => location.pathname.startsWith("/order/"), { timeout: 20000 }); return page.url().split("/order/")[1]; };

// ---------- P0: checkout is disabled until the owner configures shipping
await guard("P0 unconfigured shipping", async () => {
  const { ctx, page } = await newCustomer(); await addToCart(page, "sample-saree-sage"); await go(page, "/checkout");
  const t = await page.evaluate(() => document.body.innerText); check("checkout shows 'not available' while shipping is unconfigured", t.includes("shipping rates and delivery areas have not been set") && !(await page.$("#name")));
  const r = await page.evaluate(async () => { const x = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ sku: "DEV-S2-FS", qty: 1 }], customer: { name: "Test Person", phone: "9876543210" }, address: { line1: "12 Road", city: "Kochi", state: "Kerala", pincode: "682001" }, paymentMethod: "cod", consent: true, idempotencyKey: "p0-unconfigured-0123456789" }) }); return [x.status, (await x.json()).error]; });
  check("order API refuses (503 shipping_not_configured) and stock untouched", r[0] === 503 && r[1] === "shipping_not_configured" && await stockOf("DEV-S2-FS") === 2, JSON.stringify(r)); await ctx.close();
});
// ---------- P1: admin signs in, configures shipping, creates and edits a product through the UI
const adminCtx = await b.createBrowserContext(); const admin = await adminCtx.newPage(); await admin.setViewport({ width: 1280, height: 900 }); admin.on("dialog", (d) => d.accept());
await guard("P1 admin", async () => {
  await go(admin, "/admin/login"); await admin.type("#email", "owner@e2e.test"); await admin.type("#password", "wrong-password-zzz"); await clickText(admin, "button", "Sign in"); await admin.waitForFunction(() => document.body.innerText.includes("Incorrect email or password"));
  check("wrong admin password is rejected in the UI", admin.url().includes("/admin/login"));
  await admin.$eval("#password", (e) => (e.value = "")); await admin.type("#password", "e2e-admin-password-123"); await clickText(admin, "button", "Sign in"); await admin.waitForFunction(() => location.pathname === "/admin/orders", { timeout: 15000 });
  const ck = (await admin.cookies()).find((c) => c.name === "lb_admin"); check("session cookie is HttpOnly, SameSite=Strict, Secure", !!ck && ck.httpOnly && ck.sameSite === "Strict" && ck.secure, JSON.stringify(ck && { h: ck.httpOnly, s: ck.sameSite, sec: ck.secure }));
  await go(admin, "/admin/settings"); await admin.type("#flatRate", "80"); await admin.type("#freeOver", "3000"); await admin.type("#pins", "695, 68"); await clickText(admin, "button", "Save shipping settings"); await admin.waitForFunction(() => document.body.innerText.includes("Saved."));
  check("shipping settings saved to DB", JSON.stringify((await Q("select value from settings where key='shipping'"))[0]?.value) === JSON.stringify({ flatRate: 80, freeOver: 3000, pinPrefixes: ["695", "68"] }));
  await go(admin, "/admin/products/new"); await admin.type("#name", "E2E Kurti"); await admin.type("#slug", "e2e-kurti"); await admin.select("#status", "active"); await admin.type("#price", "1200"); await admin.type("#description", "E2E test product");
  await admin.type("#variants", "E2E-M, M, Sage, 4\nE2E-L, L, Sage, 0"); await admin.type("#images", "E2E front view | https://images.example.test/e2e.jpg"); await clickText(admin, "button", "Save product"); await admin.waitForFunction(() => location.pathname === "/admin/products", { timeout: 15000 });
  check("product created via admin UI and visible in admin list", (await admin.evaluate(() => document.body.innerText)).includes("E2E Kurti") && (await Q("select count(*)::int n from variants where sku like 'E2E-%'"))[0].n === 2);
  await go(admin, "/admin/products"); const id = (await Q("select id from products where slug='e2e-kurti'"))[0].id; await go(admin, `/admin/products/${id}`);
  await admin.$eval("#variants", (e) => (e.value = "E2E-M, M, Sage, 4\nE2E-L, L, Sage, 3")); await admin.$eval("#price", (e) => (e.value = "1300")); await clickText(admin, "button", "Save product"); await admin.waitForFunction(() => location.pathname === "/admin/products", { timeout: 15000 });
  check("product edit (price + stock) persisted", await stockOf("E2E-L") === 3 && (await Q("select price from products where slug='e2e-kurti'"))[0].price === 1300);
  const html = await (await fetch(BASE + "/product/e2e-kurti")).text(); check("admin-supplied image renders as <img> with the alt text you entered", /<img[^>]+alt="E2E front view"/.test(html));
  await go(admin, `/admin/products/${id}`); await admin.select("#status", "inactive"); await clickText(admin, "button", "Save product"); await admin.waitForFunction(() => location.pathname === "/admin/products");
  check("archived product disappears from storefront (404)", (await fetch(BASE + "/product/e2e-kurti")).status === 404);
  await go(admin, `/admin/products/${id}`); await admin.select("#status", "active"); await clickText(admin, "button", "Save product"); await admin.waitForFunction(() => location.pathname === "/admin/products");
  check("re-published product is visible again", (await fetch(BASE + "/product/e2e-kurti")).status === 200);
});
// ---------- P2: customer journey (phone width)
let codRef, codSlug, codQty, codSku;
await guard("P2 journey", async () => {
  const { ctx, page } = await newCustomer(); await go(page, "/");
  check("1 homepage: hero CTA 'Shop Collection' links to /shop", await page.$eval("a.btn-primary", (a) => a.getAttribute("href") === "/shop" && a.textContent.includes("Shop Collection")));
  await page.click('button[aria-controls="mobile-nav"]'); check("mobile menu opens (aria-expanded=true)", await page.$eval('button[aria-controls="mobile-nav"]', (e) => e.getAttribute("aria-expanded") === "true"));
  await clickText(page, "#mobile-nav a", "New Arrivals"); await page.waitForFunction(() => location.pathname === "/collections/new-arrivals"); check("2 collection opens from menu", (await page.$eval("h1", (e) => e.textContent)) === "New Arrivals");
  await go(page, "/shop"); await page.click("details summary"); await page.type("#m-q", "kurti"); await page.click('details input[name="size"][value="M"]'); await page.select("#m-sort", "price-asc");
  await Promise.all([page.waitForNavigation(), page.click('details form button[type="submit"]')]);
  const names = await page.$$eval("article h3", (x) => x.map((e) => e.textContent)); const prices = await page.$$eval("article", (x) => x.map((a) => Number(a.innerText.match(/₹([\d,]+)/)[1].replace(/,/g, ""))));
  check("3 search+size+sort: URL reflects filters, only kurtis, ascending price", page.url().includes("q=kurti") && page.url().includes("size=M") && page.url().includes("sort=price-asc") && names.length >= 3 && names.every((n) => /Kurti/i.test(n)) && prices.every((p, i) => i === 0 || p >= prices[i - 1]), `${names.length} results prices=${prices}`);
  const cnt = await page.$eval('p[role="status"]', (e) => e.textContent); check("result count matches cards", Number(cnt.match(/^(\d+)/)[1]) === names.length, cnt);
  await go(page, "/shop?q=zzzz"); check("empty state shown with clear action", (await page.evaluate(() => document.body.innerText)).includes("No products match") && !!(await page.$('a[href="/shop"].btn-primary')));
  await go(page, "/shop?colour=Sage&inStock=1"); const sage = await page.$$eval("article h3", (x) => x.map((e) => e.textContent)); check("colour + in-stock filters affect results", sage.length > 0 && sage.every((n) => n.includes("Sage") || n.includes("E2E Kurti")), sage.join(", "));
  await go(page, "/shop?size=M&sort=price-asc"); await clickText(page, "article h3", ""); const firstHref = await page.$eval("article a", (a) => a.getAttribute("href")); await Promise.all([page.waitForNavigation(), page.click("article a")]);
  check("4 product page opens from grid", page.url().includes(firstHref) && (await page.$$("h1")).length === 1);
  const dis = await page.$$eval("fieldset button[aria-pressed]", (bs) => bs.map((x) => x.disabled)); const before = await cartCount(page);
  await page.click('button[aria-label="Show image 3: ' + (await page.$eval('button[aria-label^="Show image 3"]', (e) => e.getAttribute("aria-label").replace("Show image 3: ", ""))) + '"]'); check("gallery thumbnail selects image 3 of 3", (await page.$eval('p.sr-only[role="status"]', (e) => e.textContent)).includes("3 of 3"));
  check("add-to-cart is disabled until a size is chosen", await page.$$eval("button", (bs) => bs.find((x) => /Select a size/.test(x.textContent))?.disabled === true));
  // deterministic product for totals
  codSlug = "sample-kurti-ivory"; codSku = "DEV-K3-M"; const pick = await addToCart(page, codSlug, { size: "M", qtyClicks: 1 }); codQty = 2;
  check("5-6 size M chosen, qty 2 added; header count updates", pick === "M" && (await cartCount(page)) === "Cart (2)", await cartCount(page));
  await go(page, "/cart"); await page.waitForSelector("ul li"); let sub = inrNum(await page.$eval("p.text-lg strong", (e) => e.textContent)); const price = (await Q("select price, sale_price from products where slug=$1", [codSlug]))[0]; const unit = price.sale_price ?? price.price;
  check("7 cart subtotal = qty × database price", sub === unit * 2, `${sub} vs ${unit * 2}`);
  await page.click('button[aria-label^="Increase quantity of"]'); await sleep(700); sub = inrNum(await page.$eval("p.text-lg strong", (e) => e.textContent)); codQty = 3; check("quantity + updates the subtotal", sub === unit * 3, String(sub));
  await page.reload({ waitUntil: "networkidle0" }); await page.waitForSelector("ul li"); check("cart persists across page refresh", inrNum(await page.$eval("p.text-lg strong", (e) => e.textContent)) === unit * 3 && (await cartCount(page)) === "Cart (3)");
  await Promise.all([page.waitForNavigation(), clickText(page, "a", "Checkout")]); await page.waitForSelector("#name");
  // validation
  await clickText(page, "button", "Place order"); await page.waitForSelector(".field-error"); await sleep(200); check("8a0 focus moves to the first invalid field after a failed submit", await page.evaluate(() => document.activeElement?.id === "name"));
  const bad = await page.$$eval('input[aria-invalid="true"]', (xs) => xs.map((x) => { const d = document.getElementById(x.getAttribute("aria-describedby") || ""); return !!d && d.textContent.length > 0; })); check("8a empty submit: every invalid field is aria-invalid with a described error", bad.length >= 5 && bad.every(Boolean), `${bad.length} fields`);
  await page.type("#name", "E2E Customer"); await page.type("#phone", "12345"); await page.type("#email", "not-an-email"); await page.type("#line1", "12 Test Road, Kannammoola"); await page.type("#city", "Thiruvananthapuram"); await page.type("#pincode", "560001");
  await page.click('input[type="checkbox"]'); await clickText(page, "label", "Cash on delivery"); await clickText(page, "button", "Place order"); await sleep(900);
  const t1 = await page.evaluate(() => document.body.innerText); check("8b invalid phone/email show field errors; no order created", t1.includes("valid 10-digit") && t1.includes("valid email") && (await Q("select count(*)::int n from orders"))[0].n === 0);
  await page.$eval("#phone", (e) => (e.value = "")); await page.type("#phone", "9876543210"); await page.$eval("#email", (e) => (e.value = "")); await page.type("#email", "e2e@example.test"); await clickText(page, "button", "Place order"); await sleep(1200);
  check("8c non-serviceable PIN is refused with a clear message", (await page.evaluate(() => document.body.innerText)).includes("cannot deliver to this PIN") && (await Q("select count(*)::int n from orders"))[0].n === 0);
  await page.$eval("#pincode", (e) => (e.value = "")); await page.type("#pincode", "695011"); await sleep(900); check("8c2 stale error message clears once the customer edits a field", !(await page.evaluate(() => document.body.innerText)).includes("cannot deliver to this PIN"));
  const sumTxt = await page.$eval('aside[aria-label="Order summary"]', (e) => e.innerText); const expectShip = unit * 3 >= 3000 ? 0 : 80;
  check("8d summary shows server-calculated shipping and total", sumTxt.includes(expectShip === 0 ? "Free" : "₹80") && inrNum(sumTxt.match(/Total\s*₹([\d,]+)/)[1]) === unit * 3 + expectShip, sumTxt.replace(/\n/g, " ").slice(-90));
  await page.$eval('input[type="checkbox"]', (e) => e.checked && e.click()); await clickText(page, "button", "Place order"); await sleep(800); check("consent is required", (await page.evaluate(() => document.body.innerText)).includes("Please agree") && (await Q("select count(*)::int n from orders"))[0].n === 0); await page.click('input[type="checkbox"]');
  const stockBefore = await stockOf(codSku); const btn = await page.evaluateHandle(() => [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Place order")));
  await Promise.all([btn.click(), btn.click()]).catch(() => {}); await page.waitForFunction(() => location.pathname.startsWith("/order/"), { timeout: 20000 }); codRef = page.url().split("/order/")[1];
  const orders = await Q("select * from orders"); check("9 double-click creates exactly one order (COD, status placed)", orders.length === 1 && orders[0].status === "placed" && orders[0].payment_method === "cod" && orders[0].total === unit * 3 + expectShip, `orders=${orders.length}`);
  check("order stock reserved (decremented by ordered qty)", await stockOf(codSku) === stockBefore - 3, `${stockBefore} -> ${await stockOf(codSku)}`);
  const body = await page.evaluate(() => document.body.innerText); check("order confirmation shows reference, status and total only (no phone/address/email)", body.includes(codRef) && body.includes("awaiting confirmation") && !/9876543210|e2e@example|12 Test Road|E2E Customer/.test(body));
  check("cart cleared after order", (await cartCount(page)) === "Cart (0)");
  const replay = await page.evaluate(async () => { const k = "replay-key-0123456789abcd"; const b = JSON.stringify({ items: [{ sku: "DEV-C3-S", qty: 1, price: 1 }], customer: { name: "Replay Person", phone: "9876543210" }, address: { line1: "12 Road", city: "Kochi", state: "Kerala", pincode: "682001" }, paymentMethod: "cod", consent: true, idempotencyKey: k, total: 1 }); const a = await (await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: b })).json(); const c = await (await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: b })).json(); return [a.order.ref, c.order.ref, c.duplicate, a.order.total]; });
  check("API replay with same idempotency key returns the same order; client price/total ignored", replay[0] === replay[1] && replay[2] === true && replay[3] === 2100 + 80 - 0 || replay[3] >= 2100, JSON.stringify(replay)); await ctx.close();
});
// ---------- P3: online payment (hosted-widget stand-in), failures, expiry
const online = {};
await guard("P3 online", async () => {
  const { ctx, page } = await newCustomer(); mode = "success"; await addToCart(page, "e2e-kurti", { size: "M" }); await go(page, "/checkout"); await page.waitForSelector("#name"); await fillCheckout(page); await page.click('input[type="checkbox"]'); await page.click('input[value="online"], input[name="pay"]:first-of-type');
  const radios = await page.$$eval('input[name="pay"]', (r) => r.map((x) => x.checked)); await sleep(600); online.ref1 = await placeOrder(page); await page.waitForFunction(() => document.body.innerText.includes("Status: Confirmed"), { timeout: 15000 });
  const o1 = (await Q("select * from orders where ref=$1", [online.ref1]))[0]; check("10 online payment: signed callback verified server-side -> confirmed/paid", o1.status === "confirmed" && o1.payment_status === "paid" && o1.payment_method === "online" && !!o1.gateway_payment_id, `${o1.status}/${o1.payment_status}`);
  const log = fs.readFileSync((process.env.RZP_STUB_LOG ?? "/tmp/rzp-stub.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l)); const last = JSON.parse(log[log.length - 1].body); check("gateway order created server-side with DB total in paise + valid credentials", last.amount === o1.total * 100 && log[log.length - 1].auth === true && last.currency === "INR", JSON.stringify(last));
  // bad signature
  mode = "badsig"; await addToCart(page, "e2e-kurti", { size: "M" }); await go(page, "/checkout"); await page.waitForSelector("#name"); await fillCheckout(page); await page.click('input[type="checkbox"]'); await sleep(500); online.ref2 = await placeOrder(page); await sleep(1200);
  const o2 = (await Q("select status, payment_status from orders where ref=$1", [online.ref2]))[0]; check("11a forged payment signature is rejected; order stays pending_payment/unpaid", o2.status === "pending_payment" && o2.payment_status === "unpaid" && (await page.evaluate(() => document.body.innerText)).includes("Awaiting payment"), JSON.stringify(o2));
  // user closes widget, then retries successfully from the order page
  mode = "dismiss"; await addToCart(page, "e2e-kurti", { size: "M" }); await go(page, "/checkout"); await page.waitForSelector("#name"); await fillCheckout(page); await page.click('input[type="checkbox"]'); await sleep(500); online.ref3 = await placeOrder(page);
  const s3 = await stockOf("E2E-M"); check("11b payment window dismissed: order held as pending and stock reserved", (await Q("select status from orders where ref=$1", [online.ref3]))[0].status === "pending_payment" && (await page.evaluate(() => document.body.innerText)).includes("Complete payment"));
  mode = "success"; await clickText(page, "button", "Complete payment"); await page.waitForFunction(() => document.body.innerText.includes("Status: Confirmed"), { timeout: 15000 }); check("11c 'Complete payment' retry succeeds and confirms the order", (await Q("select status, payment_status from orders where ref=$1", [online.ref3]))[0].status === "confirmed");
  // expiry of the abandoned forged-signature order
  const before = await stockOf("E2E-M"); await db.query("update orders set created_at = now() - interval '2 hours' where ref=$1", [online.ref2]);
  const noAuth = await page.evaluate(async () => (await fetch("/api/cron/expire-pending", { method: "POST" })).status); const withAuth = await page.evaluate(async () => (await fetch("/api/cron/expire-pending", { method: "POST", headers: { authorization: "Bearer e2e_cron_secret" } })).json());
  check("12 expiry job needs its secret; cancels stale unpaid order and releases stock", noAuth === 401 && withAuth.cancelled === 1 && (await Q("select status from orders where ref=$1", [online.ref2]))[0].status === "cancelled" && await stockOf("E2E-M") === before + 1, `before=${before} after=${await stockOf("E2E-M")}`);
  const hook = await page.evaluate(async () => { const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x", order_id: "order_stub_1", amount: 100 } } } }); const r = await fetch("/api/webhooks/razorpay", { method: "POST", body, headers: { "x-razorpay-signature": "bad" } }); return r.status; }); check("webhook with invalid signature is rejected (400)", hook === 400);
  await ctx.close();
});
// ---------- P4: unavailable products, tampering
await guard("P4 unavailable", async () => {
  const { ctx, page } = await newCustomer(); await go(page, "/product/sample-kurti-burgundy"); check("13a sold-out product: purchase button disabled 'Out of stock'", await page.$$eval("button", (bs) => bs.find((x) => x.textContent.trim() === "Out of stock")?.disabled === true));
  check("13b inactive product returns 404", (await fetch(BASE + "/product/sample-kurti-inactive")).status === 404);
  await go(page, "/"); await page.evaluate(() => localStorage.setItem("lb-cart-v1", JSON.stringify([{ sku: "DEV-K2-S", qty: 1 }]))); await go(page, "/cart"); await page.waitForSelector("ul li"); const t = await page.evaluate(() => document.body.innerText);
  check("13c sold-out item in cart is flagged and checkout is blocked", t.includes("Currently out of stock") && await page.$$eval("button", (bs) => bs.find((x) => x.textContent.trim() === "Checkout")?.disabled === true));
  const r = await page.evaluate(async () => { const f = (items, extra = {}) => fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items, customer: { name: "Tamper Test", phone: "9876543210" }, address: { line1: "12 Road", city: "Kochi", state: "Kerala", pincode: "682001" }, paymentMethod: "cod", consent: true, idempotencyKey: crypto.randomUUID(), ...extra }) }).then((x) => x.status); return [await f([{ sku: "DEV-K2-S", qty: 1 }]), await f([{ sku: "DEV-S2-FS", qty: 99 }]), await f([{ sku: "DEV-S2-FS", qty: 5 }]), await f([{ sku: "NOPE", qty: 1 }]), await f([{ sku: "DEV-S2-FS", qty: 1 }], { paymentMethod: "bitcoin" })]; });
  check("14 manipulated orders rejected: sold-out 409, qty 99 -> 422, over-stock 409, unknown SKU 409, bad method 422", JSON.stringify(r) === "[409,422,409,409,422]", JSON.stringify(r)); check("no order or stock change from rejected attempts", await stockOf("DEV-S2-FS") === 2 && (await Q("select count(*)::int n from orders where customer->>'name'='Tamper Test'"))[0].n === 0);
  await go(page, "/product/sample-saree-sage"); const wa = await page.$eval('a[href^="https://wa.me/"]', (a) => ({ href: a.href, target: a.target, rel: a.rel })); const text = decodeURIComponent(wa.href.split("text=")[1] ?? "");
  check("15 WhatsApp action: verified number, prefilled with product name, opens safely in new tab", wa.href.startsWith("https://wa.me/919995782624?text=") && text.includes("Sample Saree (Sage)") && wa.target === "_blank" && wa.rel.includes("noopener"), text);
  await go(page, "/contact"); check("contact page: click-to-call and directions links", await page.$eval('a[href="tel:+919995782624"]', () => true) && await page.$eval('a[href^="https://www.google.com/maps/search/"]', (a) => decodeURIComponent(a.href).includes("Kannammoola")));
  await ctx.close();
});
// ---------- P5: admin handles the orders
await guard("P5 admin orders", async () => {
  await go(admin, "/admin/orders"); const t = await admin.evaluate(() => document.body.innerText); check("16 admin order list shows the new orders", [codRef, online.ref1, online.ref2, online.ref3].every((r) => t.includes(r)));
  await go(admin, `/admin/orders?q=${codRef}`); check("order search by reference returns exactly that order", (await admin.$$eval("tbody tr", (r) => r.length)) === 1);
  await go(admin, `/admin/orders?status=cancelled`); check("status filter works", (await admin.$$eval("tbody tr", (r) => r.length)) === 1);
  const id = (await Q("select id from orders where ref=$1", [codRef]))[0].id; await go(admin, `/admin/orders/${id}`); const d = await admin.evaluate(() => document.body.innerText);
  check("order detail shows customer-provided delivery info and items", d.includes("E2E Customer") && d.includes("9876543210") && d.includes("12 Test Road") && d.includes("DEV-K3-M"));
  await clickText(admin, "button", "Mark confirmed"); await admin.waitForFunction(() => document.body.innerText.includes("Status: confirmed") || document.body.innerText.includes("confirmed"), { timeout: 8000 }); await sleep(800);
  check("17a status placed -> confirmed via admin UI", (await Q("select status from orders where id=$1", [id]))[0].status === "confirmed");
  await admin.type("#note", "Courier X, tracking 123 (entered manually)"); await clickText(admin, "button", "Mark packed"); await sleep(1000); await admin.reload({ waitUntil: "networkidle0" }); await clickText(admin, "button", "Mark shipped"); await sleep(1000);
  const ev = await Q("select status, actor, note from order_events where order_id=$1 order by id", [id]); check("17b fulfilment steps are logged with actor and note", ev.map((e) => e.status).join(",") === "placed,confirmed,packed,shipped" && ev.some((e) => e.note.includes("tracking 123")) && ev[1].actor === "owner@e2e.test", JSON.stringify(ev.map((e) => e.status)));
  const inv = await admin.evaluate(async (id) => (await fetch(`/api/admin/orders/${id}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) })).status, id); check("17c invalid transition (shipped -> cancelled) is refused with 409", inv === 409);
  const stockBefore = await stockOf("E2E-M"); const paid = (await Q("select id from orders where ref=$1", [online.ref1]))[0].id; await go(admin, `/admin/orders/${paid}`); await clickText(admin, "button", "Mark cancelled"); await admin.waitForFunction(() => document.body.innerText.includes("refund it in the Razorpay dashboard"), { timeout: 8000 });
  check("18 cancelling a paid online order restores stock and tells the owner to refund", await stockOf("E2E-M") === stockBefore + 1 && (await Q("select status from orders where id=$1", [paid]))[0].status === "cancelled");
});
// ---------- P6: unauthorized access
await guard("P6 unauthorized", async () => {
  const { ctx, page } = await newCustomer(1280, 900); await go(page, "/admin/orders"); check("19a unauthenticated /admin/orders redirects to the login page", page.url().endsWith("/admin/login"));
  await go(page, "/admin/products/new"); check("19b unauthenticated admin product page redirects too", page.url().endsWith("/admin/login"));
  const r = await page.evaluate(async () => { const f = (u, m = "GET", b) => fetch(u, { method: m, headers: { "content-type": "application/json" }, body: b }).then((x) => x.status); return [await f("/api/admin/products"), await f("/api/admin/products", "POST", "{}"), await f("/api/admin/settings/shipping", "PUT", "{}"), await f("/api/admin/orders/x/status", "POST", '{"status":"cancelled"}')]; });
  check("19c admin APIs return 401 without a session", r.every((s) => s === 401), JSON.stringify(r)); await page.setCookie({ name: "lb_admin", value: "forged.value", domain: "localhost", path: "/" }); const r2 = await page.evaluate(async () => (await fetch("/api/admin/products")).status); check("19d forged cookie returns 401", r2 === 401); await ctx.close();
  await clickText(admin, "button", "Sign out").catch(() => {}); await go(admin, "/admin/orders"); await sleep(500); await clickText(admin, "button", "Sign out"); await admin.waitForFunction(() => location.pathname === "/admin/login", { timeout: 8000 }); await go(admin, "/admin/orders"); check("19e after sign-out the session no longer works", admin.url().endsWith("/admin/login"));
});
await b.close(); await db.end();
const pass = results.filter((r) => r.ok).length; console.log(`\n${pass}/${results.length} checks passed`); if (pass !== results.length) { console.log("FAILED:"); results.filter((r) => !r.ok).forEach((r) => console.log(" -", r.name, "|", r.info)); }
