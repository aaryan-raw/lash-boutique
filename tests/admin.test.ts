// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { COOKIE, createSession, hashPassword, login, verifySession, adminFromCookieHeader } from "@/lib/auth";
import { setDb, type Db } from "@/lib/db";
import { listActive } from "@/lib/products-repo";
import * as productsRoute from "@/app/api/admin/products/route";
import * as productRoute from "@/app/api/admin/products/[id]/route";
import * as statusRoute from "@/app/api/admin/orders/[id]/status/route";
import * as shipRoute from "@/app/api/admin/settings/shipping/route";
import * as checkoutRoute from "@/app/api/checkout/route";
import * as verifyRoute from "@/app/api/checkout/verify/route";
import * as hookRoute from "@/app/api/webhooks/razorpay/route";
import * as cronRoute from "@/app/api/cron/expire-pending/route";
import { placeOrder, parseCheckout } from "@/lib/orders";
import { makeDb, seed, body, stock } from "./helpers";
const ENV = { ADMIN_EMAIL: "owner@lash.test", ADMIN_PASSWORD_HASH: hashPassword("correct horse battery"), SESSION_SECRET: "s".repeat(40), RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "rzp_secret_x", RAZORPAY_WEBHOOK_SECRET: "wh_secret_x", ENABLE_COD: "true", CRON_SECRET: "cron_secret_x" };
const H = "http://localhost:3000";
const cookie = () => `${COOKIE}=${createSession(ENV.ADMIN_EMAIL)}`;
const req = (path: string, method: string, o: { body?: unknown; cookie?: string; origin?: string; ct?: string; raw?: string; headers?: Record<string, string> } = {}) =>
  new Request(H + path, { method, headers: { host: "localhost:3000", ...(o.ct === "none" ? {} : { "content-type": o.ct ?? "application/json" }), ...(o.cookie ? { cookie: o.cookie } : {}), ...(o.origin ? { origin: o.origin } : {}), ...o.headers }, body: method === "GET" ? undefined : o.raw ?? JSON.stringify(o.body ?? {}) });
const prod = (over = {}) => ({ name: "New Kurti", slug: "new-kurti", description: "d", category: "kurtis", price: 1200, images: [{ alt: "front" }], variants: [{ sku: "N-S", size: "S", colour: "Sage", stock: 3 }], status: "active", ...over });
let db: Db;
beforeEach(async () => { Object.assign(process.env, ENV); db = await makeDb(); await seed(db); setDb(db); });
afterEach(() => { setDb(undefined); for (const k of Object.keys(ENV)) delete process.env[k]; });

describe("admin authentication", () => {
  it("login succeeds with correct credentials, fails otherwise, and rate-limits", () => {
    expect(login(ENV.ADMIN_EMAIL, "wrong", "ip-a").ok).toBe(false); expect(login("x@y.z", "correct horse battery", "ip-a").ok).toBe(false);
    expect(login(ENV.ADMIN_EMAIL, "correct horse battery", "ip-b").ok).toBe(true);
    for (let i = 0; i < 5; i++) login(ENV.ADMIN_EMAIL, "bad", "ip-c"); expect(login(ENV.ADMIN_EMAIL, "correct horse battery", "ip-c")).toEqual({ ok: false, status: 429 });
  });
  it("login is refused when admin env is not configured (no fake auth)", () => { delete process.env.ADMIN_PASSWORD_HASH; expect(login(ENV.ADMIN_EMAIL, "anything", "ip-d")).toEqual({ ok: false, status: 503 }); });
  it("rejects forged, tampered, expired and wrong-secret sessions", () => {
    const t = createSession(ENV.ADMIN_EMAIL); expect(verifySession(t)).toEqual({ email: ENV.ADMIN_EMAIL });
    const [p] = t.split("."); const forged = Buffer.from(JSON.stringify({ sub: ENV.ADMIN_EMAIL, exp: Date.now() + 1e9 })).toString("base64url");
    expect(verifySession(`${forged}.${t.split(".")[1]}`)).toBeNull(); expect(verifySession(`${p}.AAAA`)).toBeNull(); expect(verifySession("garbage")).toBeNull(); expect(verifySession(undefined)).toBeNull();
    expect(verifySession(createSession(ENV.ADMIN_EMAIL, Date.now() - 9 * 3600 * 1000))).toBeNull();
    const other = Buffer.from(JSON.stringify({ sub: ENV.ADMIN_EMAIL, exp: Date.now() + 1e6 })).toString("base64url"); expect(verifySession(`${other}.${createHmac("sha256", "x".repeat(40)).update(other).digest("base64url")}`)).toBeNull();
    expect(adminFromCookieHeader(`a=b; ${COOKIE}=${t}`)).not.toBeNull();
  });
});
describe("unauthorized access to every admin API", () => {
  const calls: [string, () => Promise<Response>][] = [
    ["GET products", () => productsRoute.GET(req("/api/admin/products", "GET"))], ["POST products", () => productsRoute.POST(req("/api/admin/products", "POST", { body: prod() }))],
    ["PUT product", () => productRoute.PUT(req("/api/admin/products/x", "PUT", { body: prod() }), { params: Promise.resolve({ id: "x" }) })], ["POST status", () => statusRoute.POST(req("/api/admin/orders/x/status", "POST", { body: { status: "cancelled" } }), { params: Promise.resolve({ id: "x" }) })],
    ["GET shipping", () => shipRoute.GET(req("/api/admin/settings/shipping", "GET"))], ["PUT shipping", () => shipRoute.PUT(req("/api/admin/settings/shipping", "PUT", { body: { flatRate: 0, pinPrefixes: ["1"] } }))]];
  for (const [name, fn] of calls) it(`${name}: 401 without a session`, async () => expect((await fn()).status).toBe(401));
  it("401 with a forged cookie", async () => expect((await productsRoute.GET(req("/api/admin/products", "GET", { cookie: `${COOKIE}=abc.def` }))).status).toBe(401));
  it("no data is changed by unauthorized writes", async () => { await productsRoute.POST(req("/api/admin/products", "POST", { body: prod() })); expect((await listActive()).some((p) => p.slug === "new-kurti")).toBe(false); });
  it("mutations need same origin and JSON (CSRF defence)", async () => {
    expect((await productsRoute.POST(req("/api/admin/products", "POST", { body: prod(), cookie: cookie(), origin: "https://evil.example" }))).status).toBe(403);
    expect((await productsRoute.POST(req("/api/admin/products", "POST", { raw: "x=1", ct: "text/plain", cookie: cookie() }))).status).toBe(415);
  });
  it("cron endpoint needs its secret", async () => { expect((await cronRoute.POST(req("/api/cron/expire-pending", "POST"))).status).toBe(401); expect((await cronRoute.POST(req("/api/cron/expire-pending", "POST", { headers: { authorization: "Bearer cron_secret_x" } }))).status).toBe(200); });
});
describe("admin product and inventory management", () => {
  const as = cookie;
  it("creates, edits stock/price, archives; storefront reflects it", async () => {
    const c = await productsRoute.POST(req("/api/admin/products", "POST", { body: prod(), cookie: as() })); expect(c.status).toBe(201); const { id } = await c.json();
    expect((await listActive()).find((p) => p.slug === "new-kurti")?.variants[0].stock).toBe(3);
    expect((await productRoute.PUT(req(`/api/admin/products/${id}`, "PUT", { body: prod({ price: 1500, salePrice: 1300, variants: [{ sku: "N-S", size: "S", colour: "Sage", stock: 9 }, { sku: "N-M", size: "M", colour: "Sage", stock: 1 }] }), cookie: as() }), { params: Promise.resolve({ id }) })).status).toBe(200);
    const p = (await listActive()).find((x) => x.slug === "new-kurti")!; expect([p.price, p.salePrice, p.variants.length, await stock(db, "N-S")]).toEqual([1500, 1300, 2, 9]);
    await productRoute.PUT(req(`/api/admin/products/${id}`, "PUT", { body: prod({ status: "inactive" }), cookie: as() }), { params: Promise.resolve({ id }) }); expect((await listActive()).some((x) => x.slug === "new-kurti")).toBe(false);
    expect((await productRoute.PUT(req("/api/admin/products/missing", "PUT", { body: prod({ slug: "m" }), cookie: as() }), { params: Promise.resolve({ id: "missing" }) })).status).toBe(404);
  });
  it("rejects invalid product input with 422 and writes nothing", async () => {
    for (const bad of [{ price: -5 }, { price: 10.5 }, { salePrice: 2000 }, { category: "shoes" }, { slug: "Bad Slug" }, { name: "" }, { variants: [] }, { variants: [{ sku: "A", size: "S", colour: "x", stock: 1 }] },
      { variants: [{ sku: "DUP-1", size: "S", colour: "x", stock: 1 }, { sku: "DUP-1", size: "M", colour: "x", stock: 1 }] }, { variants: [{ sku: "OK-1", size: "S", colour: "x", stock: -1 }] }, { images: [{ alt: "a", url: "http://insecure.example/x.jpg" }] }, { images: [{ url: "https://x.example/a.jpg" }] }, { collections: ["nope"] }]) {
      expect((await productsRoute.POST(req("/api/admin/products", "POST", { body: prod(bad), cookie: as() }))).status).toBe(422);
    }
    expect((await db.query("select 1 from products")).rowCount).toBe(2);
  });
  it("conflicts: duplicate slug and SKU owned by another product return 409 and roll back", async () => {
    expect((await productsRoute.POST(req("/api/admin/products", "POST", { body: prod({ slug: "test-kurti" }), cookie: as() }))).status).toBe(409);
    expect((await productsRoute.POST(req("/api/admin/products", "POST", { body: prod({ slug: "another", variants: [{ sku: "T-M", size: "M", colour: "Sage", stock: 99 }] }), cookie: as() }))).status).toBe(409);
    expect(await stock(db, "T-M")).toBe(5); expect((await db.query("select 1 from products where slug='another'")).rowCount).toBe(0);
  });
  it("shipping settings validate and persist", async () => {
    expect((await shipRoute.PUT(req("/api/admin/settings/shipping", "PUT", { body: { flatRate: -1, pinPrefixes: ["695"] }, cookie: as() }))).status).toBe(422);
    expect((await shipRoute.PUT(req("/api/admin/settings/shipping", "PUT", { body: { flatRate: 60, freeOver: null, pinPrefixes: ["abc"] }, cookie: as() }))).status).toBe(422);
    expect((await shipRoute.PUT(req("/api/admin/settings/shipping", "PUT", { body: { flatRate: 60, freeOver: null, pinPrefixes: ["695"] }, cookie: as() }))).status).toBe(200);
    expect(await (await shipRoute.GET(req("/api/admin/settings/shipping", "GET", { cookie: as() }))).json()).toEqual({ flatRate: 60, freeOver: null, pinPrefixes: ["695"] });
  });
  it("admin status route enforces transitions and restocks on cancel", async () => {
    const p = parseCheckout(body({ items: [{ sku: "T-M", qty: 2 }] })); if (!p.ok) throw 0; const o = await placeOrder(db, p.value, { online: true, cod: true });
    const st = (s: string) => statusRoute.POST(req(`/api/admin/orders/${o.id}/status`, "POST", { body: { status: s }, cookie: as() }), { params: Promise.resolve({ id: o.id }) });
    expect((await st("delivered")).status).toBe(409); expect((await st("bogus")).status).toBe(422); expect((await st("cancelled")).status).toBe(200); expect(await stock(db, "T-M")).toBe(5);
  });
});
describe("checkout and payment HTTP endpoints", () => {
  it("manipulated checkout request: client price ignored, validation errors are 422", async () => {
    const ok = await checkoutRoute.POST(req("/api/checkout", "POST", { body: { ...body({ items: [{ sku: "S-FS", qty: 1, price: 1 }] }), total: 1 } })); expect(ok.status).toBe(201); expect((await ok.json()).order.total).toBe(2580);
    const bad = await checkoutRoute.POST(req("/api/checkout", "POST", { body: body({ consent: false }) })); expect(bad.status).toBe(422); expect((await bad.json()).details.consent).toBeTruthy();
    expect((await checkoutRoute.POST(req("/api/checkout", "POST", { raw: "not json" }))).status).toBe(422);
  });
  it("checkout is disabled (503) when no DB or no payment method is configured", async () => {
    delete process.env.ENABLE_COD; delete process.env.RAZORPAY_KEY_ID; expect((await checkoutRoute.POST(req("/api/checkout", "POST", { body: body() }))).status).toBe(503);
    process.env.ENABLE_COD = "true"; setDb(null); expect((await checkoutRoute.POST(req("/api/checkout", "POST", { body: body() }))).status).toBe(503);
  });
  it("online checkout cancels the order and releases stock if the gateway fails", async () => {
    const real = globalThis.fetch; globalThis.fetch = (async () => new Response("", { status: 500 })) as never;
    try { const r = await checkoutRoute.POST(req("/api/checkout", "POST", { body: body({ paymentMethod: "online" }) })); expect(r.status).toBe(502); expect(await stock(db, "T-M")).toBe(5); expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("cancelled"); } finally { globalThis.fetch = real; }
  });
  it("online checkout returns gateway order (mocked) and verify route enforces signature", async () => {
    const real = globalThis.fetch; globalThis.fetch = (async () => new Response(JSON.stringify({ id: "order_Z" }))) as never;
    try {
      const r = await checkoutRoute.POST(req("/api/checkout", "POST", { body: body({ paymentMethod: "online" }) })); const d = await r.json(); expect(r.status).toBe(201); expect(d.razorpay).toMatchObject({ orderId: "order_Z", amount: 108000 / 1 > 0 ? d.order.total * 100 : 0 }); expect(JSON.stringify(d)).not.toContain("rzp_secret_x");
      const verify = (sig: string) => verifyRoute.POST(req("/api/checkout/verify", "POST", { body: { razorpay_order_id: "order_Z", razorpay_payment_id: "pay_Z", razorpay_signature: sig } }));
      expect((await verify("bad")).status).toBe(400); expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("pending_payment");
      expect((await verify(createHmac("sha256", "rzp_secret_x").update("order_Z|pay_Z").digest("hex"))).status).toBe(200); expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("confirmed");
    } finally { globalThis.fetch = real; }
  });
  it("webhook rejects bad signatures and confirms on a signed captured event", async () => {
    const p = parseCheckout(body({ paymentMethod: "online" })); if (!p.ok) throw 0; const o = await placeOrder(db, p.value, { online: true, cod: true }); await db.query("update orders set gateway_order_id='order_W'");
    const ev = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_W", order_id: "order_W", amount: o.total * 100 } } } });
    const sig = createHmac("sha256", "wh_secret_x").update(ev).digest("hex");
    expect((await hookRoute.POST(req("/api/webhooks/razorpay", "POST", { raw: ev, headers: { "x-razorpay-signature": "bad" } }))).status).toBe(400); expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("pending_payment");
    expect((await hookRoute.POST(req("/api/webhooks/razorpay", "POST", { raw: ev, headers: { "x-razorpay-signature": sig } }))).status).toBe(200); expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("confirmed");
    const ev2 = ev.replace(String(o.total * 100), "100"); expect((await hookRoute.POST(req("/api/webhooks/razorpay", "POST", { raw: ev2, headers: { "x-razorpay-signature": createHmac("sha256", "wh_secret_x").update(ev2).digest("hex") } }))).status).toBe(409); expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("confirmed"); // mismatched amount is refused and logged
  });
});
