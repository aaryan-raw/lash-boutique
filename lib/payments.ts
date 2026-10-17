import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "./db";
import { OrderError } from "./orders";

export const paymentMethods = () => ({
  online: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  cod: process.env.ENABLE_COD === "true", // only enable once the owner confirms cash on delivery is offered
});
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");
export const verifyCheckoutSignature = (orderId: string, paymentId: string, sig: string, secret: string) => safeEq(hmac(secret, `${orderId}|${paymentId}`), sig);
export const verifyWebhookSignature = (rawBody: string, sig: string, secret: string) => safeEq(hmac(secret, rawBody), sig);

/** Creates a Razorpay order server-side. `fetchImpl` is injectable for tests. Amount is taken from our database total, never from the client. */
export async function createGatewayOrder(ref: string, totalInr: number, fetchImpl: typeof fetch = fetch): Promise<string> {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new OrderError(503, "payments_not_configured");
  const res = await fetchImpl(`${process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com"}/v1/orders`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
    body: JSON.stringify({ amount: totalInr * 100, currency: "INR", receipt: ref }) });
  if (!res.ok) throw new OrderError(502, "gateway_error");
  const body = (await res.json()) as { id?: string };
  if (!body.id) throw new OrderError(502, "gateway_error");
  return body.id;
}

export type PaidResult = { ok: true; state: "confirmed" | "already_paid" | "paid_after_cancel" } | { ok: false; error: "unknown_order" | "amount_mismatch" };
/** Idempotent. Only a verified payment (signature or webhook, checked by caller) may confirm an order, and the amount must match our stored total. */
export async function markPaid(db: Db, p: { gatewayOrderId: string; paymentId: string; amountPaise: number }): Promise<PaidResult> {
  return db.tx(async (q) => {
    const o = (await q.query<{ id: string; status: string; payment_status: string; total: number }>("select id, status, payment_status, total from orders where gateway_order_id = $1 for update", [p.gatewayOrderId])).rows[0];
    if (!o) return { ok: false as const, error: "unknown_order" as const };
    if (p.amountPaise !== o.total * 100) { await q.query("insert into order_events (order_id, status, note, actor) values ($1,$2,'Payment amount did not match order total','payment')", [o.id, o.status]); return { ok: false as const, error: "amount_mismatch" as const }; }
    if (o.payment_status === "paid" || o.payment_status === "paid_after_cancel") return { ok: true as const, state: "already_paid" as const };
    if (o.status === "cancelled") {
      await q.query("update orders set payment_status = 'paid_after_cancel', gateway_payment_id = $2, updated_at = now() where id = $1", [o.id, p.paymentId]);
      await q.query("insert into order_events (order_id, status, note, actor) values ($1,'cancelled','Payment received after cancellation: refund required','payment')", [o.id]);
      return { ok: true as const, state: "paid_after_cancel" as const };
    }
    await q.query("update orders set status = 'confirmed', payment_status = 'paid', gateway_payment_id = $2, updated_at = now() where id = $1", [o.id, p.paymentId]);
    await q.query("insert into order_events (order_id, status, note, actor) values ($1,'confirmed','Payment verified','payment')", [o.id]);
    return { ok: true as const, state: "confirmed" as const };
  });
}
