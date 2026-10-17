// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { setDb, type Db } from "@/lib/db";
import { canTransition, changeStatus, expirePending, OrderError, parseCheckout, placeOrder } from "@/lib/orders";
import { createGatewayOrder, markPaid, verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments";
import { notifyOrder } from "@/lib/notify";
import { makeDb, seed, body, stock } from "./helpers";
const M = { online: true, cod: true };
const place = async (db: Db, over: Record<string, unknown> = {}, methods = M) => { const p = parseCheckout(body(over)); if (!p.ok) throw new Error("invalid " + JSON.stringify(p.errors)); return placeOrder(db, p.value, methods); };
const code = async (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof OrderError ? e.code : "other:" + e.message));
let db: Db;
beforeEach(async () => { db = await makeDb(); await seed(db); setDb(db); });
afterEach(() => setDb(undefined));

describe("checkout validation", () => {
  it("rejects bad phone, PIN, missing consent, empty cart, short key, bad method", () => {
    for (const over of [{ customer: { name: "A", phone: "12345" } }, { address: { line1: "x street", city: "c", state: "s", pincode: "12" } }, { consent: false }, { items: [] }, { idempotencyKey: "short" }, { paymentMethod: "bitcoin" }]) expect(parseCheckout(body(over)).ok).toBe(false);
  });
  it("normalizes +91 phone and strips unknown/tampered fields", () => {
    const p = parseCheckout(body({ items: [{ sku: "T-M", qty: 1, price: 1, unitPrice: 1 }], total: 1 })); expect(p.ok && p.value.customer.phone).toBe("9995782624"); expect(JSON.stringify(p)).not.toContain('"price"');
  });
});
describe("order placement: server-authoritative totals and inventory", () => {
  it("uses DB sale price + shipping, ignores client prices, decrements stock", async () => {
    const o = await place(db, { items: [{ sku: "S-FS", qty: 1, price: 1 }] }); expect(o.total).toBe(2500 + 80); expect(o.status).toBe("placed"); expect(o.ref).toMatch(/^LB-[A-Z2-9]{8}$/); expect(await stock(db, "S-FS")).toBe(0);
  });
  it("free shipping at or over threshold", async () => { expect((await place(db, { items: [{ sku: "T-M", qty: 3 }] })).total).toBe(3000); });
  it("not serviceable PIN, unknown SKU, quantity above stock, unavailable method: rejected with no stock change", async () => {
    expect(await code(place(db, { address: { line1: "12 Test Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" } }))).toBe("not_serviceable");
    expect(await code(place(db, { items: [{ sku: "NOPE", qty: 1 }] }))).toBe("item_unavailable");
    expect(await code(place(db, { items: [{ sku: "T-M", qty: 1 }, { sku: "S-FS", qty: 2 }] }))).toBe("insufficient_stock");
    expect(await stock(db, "T-M")).toBe(5); expect(await stock(db, "S-FS")).toBe(1); // rolled back, no partial decrement
    expect(await code(place(db, { paymentMethod: "cod" }, { online: true, cod: false }))).toBe("payment_method_unavailable");
    expect((await db.query("select 1 from orders")).rowCount).toBe(0);
  });
  it("blocks checkout when shipping is not configured", async () => { await db.query("delete from settings"); expect(await code(place(db))).toBe("shipping_not_configured"); expect(await stock(db, "T-M")).toBe(5); });
  it("inactive products cannot be ordered", async () => { await db.query("update products set status='inactive'"); expect(await code(place(db))).toBe("item_unavailable"); });
  it("duplicate submission with the same idempotency key creates one order and one stock decrement", async () => {
    const b = body({}, "same-key-1234567890abc"); const p = parseCheckout(b); if (!p.ok) throw 0;
    const [a, c] = await Promise.all([placeOrder(db, p.value, M), placeOrder(db, p.value, M)]);
    expect(a.ref).toBe(c.ref); expect([a.duplicate, c.duplicate].sort()).toEqual([false, true]); expect(await stock(db, "T-M")).toBe(4); expect((await db.query("select 1 from orders")).rowCount).toBe(1);
  });
  it("concurrent orders for the last unit: exactly one wins", async () => {
    const r = await Promise.all([code(place(db, { items: [{ sku: "S-FS", qty: 1 }] })), code(place(db, { items: [{ sku: "S-FS", qty: 1 }] }))]);
    expect(r.sort()).toEqual(["insufficient_stock", "ok"]); expect(await stock(db, "S-FS")).toBe(0);
  });
});
describe("status transitions and inventory on cancel", () => {
  it("allowed and forbidden transitions", () => {
    expect(canTransition("placed", "confirmed")).toBe(true); expect(canTransition("pending_payment", "confirmed")).toBe(false); expect(canTransition("delivered", "packed")).toBe(false); expect(canTransition("shipped", "cancelled")).toBe(false); expect(canTransition("cancelled", "placed")).toBe(false);
  });
  it("full fulfilment flow is recorded; invalid jump rejected", async () => {
    const o = await place(db); for (const s of ["confirmed", "packed", "shipped", "delivered"] as const) await changeStatus(db, o.id, s, "admin@x", s === "shipped" ? "Courier X 123" : "");
    expect(await code(changeStatus(db, o.id, "packed", "a"))).toBe("invalid_transition");
    expect((await db.query("select * from order_events where order_id=$1", [o.id])).rowCount).toBe(5);
  });
  it("cancel restores stock once; cancelling again is rejected", async () => {
    const o = await place(db, { items: [{ sku: "T-M", qty: 2 }] }); expect(await stock(db, "T-M")).toBe(3);
    await changeStatus(db, o.id, "cancelled", "a"); expect(await stock(db, "T-M")).toBe(5);
    expect(await code(changeStatus(db, o.id, "cancelled", "a"))).toBe("invalid_transition"); expect(await stock(db, "T-M")).toBe(5);
    expect(await code(changeStatus(db, "missing", "cancelled", "a"))).toBe("order_not_found");
  });
  it("shipped orders cannot be cancelled and returns do not auto-restock", async () => {
    const o = await place(db); for (const s of ["confirmed", "packed", "shipped"] as const) await changeStatus(db, o.id, s, "a");
    expect(await code(changeStatus(db, o.id, "cancelled", "a"))).toBe("invalid_transition"); await changeStatus(db, o.id, "returned", "a"); expect(await stock(db, "T-M")).toBe(4);
  });
  it("expirePending cancels stale unpaid online orders and releases stock", async () => {
    const o = await place(db, { paymentMethod: "online" }); expect(o.status).toBe("pending_payment"); expect(await expirePending(db, 30)).toBe(0);
    await db.query("update orders set created_at = now() - interval '2 hours'"); expect(await expirePending(db, 30)).toBe(1); expect(await stock(db, "T-M")).toBe(5);
  });
});
describe("payments", () => {
  const SECRET = "test_secret";
  it("signature verification accepts valid and rejects tampered", () => {
    const sig = createHmac("sha256", SECRET).update("order_1|pay_1").digest("hex");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, SECRET)).toBe(true); expect(verifyCheckoutSignature("order_1", "pay_2", sig, SECRET)).toBe(false); expect(verifyCheckoutSignature("order_1", "pay_1", "bad", SECRET)).toBe(false);
    expect(verifyWebhookSignature("{}", createHmac("sha256", "w").update("{}").digest("hex"), "w")).toBe(true); expect(verifyWebhookSignature("{ }", createHmac("sha256", "w").update("{}").digest("hex"), "w")).toBe(false);
  });
  it("gateway order uses DB total in paise (mocked Razorpay, not live)", async () => {
    process.env.RAZORPAY_KEY_ID = "k"; process.env.RAZORPAY_KEY_SECRET = "s";
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "order_X" }))); expect(await createGatewayOrder("LB-1", 2580, f as never)).toBe("order_X");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]; expect(url).toBe("https://api.razorpay.com/v1/orders"); expect(JSON.parse(init.body as string).amount).toBe(258000);
    expect(await code(createGatewayOrder("LB-1", 1, (async () => new Response("", { status: 500 })) as never))).toBe("gateway_error");
    delete process.env.RAZORPAY_KEY_ID; expect(await code(createGatewayOrder("LB-1", 1))).toBe("payments_not_configured");
  });
  it("verified payment confirms; replay is idempotent; wrong amount rejected; unknown order rejected", async () => {
    const o = await place(db, { paymentMethod: "online" }); await db.query("update orders set gateway_order_id='order_A' where id=$1", [o.id]);
    expect(await markPaid(db, { gatewayOrderId: "order_A", paymentId: "p", amountPaise: 1 })).toEqual({ ok: false, error: "amount_mismatch" });
    expect((await db.query<{ status: string }>("select status from orders")).rows[0].status).toBe("pending_payment");
    expect(await markPaid(db, { gatewayOrderId: "order_A", paymentId: "p", amountPaise: o.total * 100 })).toEqual({ ok: true, state: "confirmed" });
    expect(await markPaid(db, { gatewayOrderId: "order_A", paymentId: "p", amountPaise: o.total * 100 })).toEqual({ ok: true, state: "already_paid" });
    expect(await markPaid(db, { gatewayOrderId: "nope", paymentId: "p", amountPaise: 1 })).toEqual({ ok: false, error: "unknown_order" });
  });
  it("payment arriving after cancellation is flagged for refund, not confirmed", async () => {
    const o = await place(db, { paymentMethod: "online" }); await db.query("update orders set gateway_order_id='order_B' where id=$1", [o.id]); await changeStatus(db, o.id, "cancelled", "system");
    expect(await markPaid(db, { gatewayOrderId: "order_B", paymentId: "p", amountPaise: o.total * 100 })).toEqual({ ok: true, state: "paid_after_cancel" });
    const r = (await db.query<{ status: string; payment_status: string }>("select status, payment_status from orders")).rows[0]; expect(r).toEqual({ status: "cancelled", payment_status: "paid_after_cancel" });
  });
  it("cancelling a paid order flags that a refund check is needed", async () => {
    const o = await place(db, { paymentMethod: "online" }); await db.query("update orders set gateway_order_id='order_C' where id=$1", [o.id]); await markPaid(db, { gatewayOrderId: "order_C", paymentId: "p", amountPaise: o.total * 100 });
    expect((await changeStatus(db, o.id, "cancelled", "a")).refundCheckNeeded).toBe(true);
  });
});
describe("notifications", () => {
  it("does nothing when email is not configured", async () => { delete process.env.RESEND_API_KEY; const f = vi.fn(); expect(await notifyOrder({ ref: "R", total: 1, customerName: "A", paymentMethod: "cod" }, f as never)).toEqual({ sent: 0, reason: "email_not_configured" }); expect(f).not.toHaveBeenCalled(); });
  it("sends via provider when configured; failure never throws (mocked, not live)", async () => {
    process.env.RESEND_API_KEY = "k"; process.env.EMAIL_FROM = "a@b.c"; process.env.OWNER_EMAIL = "o@b.c";
    const f = vi.fn(async () => new Response("{}")); expect((await notifyOrder({ ref: "R", total: 1, customerName: "A", customerEmail: "c@d.e", paymentMethod: "cod" }, f as never)).sent).toBe(2);
    expect((await notifyOrder({ ref: "R", total: 1, customerName: "A", paymentMethod: "cod" }, (async () => { throw new Error("net"); }) as never)).sent).toBe(0);
    delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; delete process.env.OWNER_EMAIL;
  });
});
