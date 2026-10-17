import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { markPaid, verifyWebhookSignature } from "@/lib/payments";
export async function POST(req: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET, db = getDb();
    if (!secret || !db) return json(503, { error: "webhook_not_configured" });
    const raw = await req.text(); // signature is over the exact raw body
    if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "", secret)) return json(400, { error: "invalid_signature" });
    const ev = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } } };
    const pay = ev.payload?.payment?.entity;
    if ((ev.event === "payment.captured" || ev.event === "order.paid") && pay?.id && pay.order_id && typeof pay.amount === "number") {
      const r = await markPaid(db, { gatewayOrderId: pay.order_id, paymentId: pay.id, amountPaise: pay.amount });
      if (!r.ok && r.error === "amount_mismatch") return json(409, { error: r.error });
    }
    return json(200, { ok: true });
  } catch (e) { return fail(e); }
}
