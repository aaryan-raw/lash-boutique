import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { markPaid, verifyCheckoutSignature } from "@/lib/payments";
import { notifyOrder } from "@/lib/notify";
export async function POST(req: Request) {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET, db = getDb();
    if (!secret || !db) return json(503, { error: "payments_not_configured" });
    const b = (await req.json().catch(() => null)) as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string } | null;
    if (!b?.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) return json(400, { error: "invalid_request" });
    if (!verifyCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature, secret)) return json(400, { error: "invalid_signature" });
    const o = (await db.query<{ ref: string; total: number; customer: { name: string; email?: string } }>("select ref, total, customer from orders where gateway_order_id = $1", [b.razorpay_order_id])).rows[0];
    if (!o) return json(404, { error: "unknown_order" });
    const r = await markPaid(db, { gatewayOrderId: b.razorpay_order_id, paymentId: b.razorpay_payment_id, amountPaise: o.total * 100 });
    if (!r.ok) return json(409, { error: r.error });
    if (r.state === "confirmed") await notifyOrder({ ref: o.ref, total: o.total, customerName: o.customer.name, customerEmail: o.customer.email, paymentMethod: "online" });
    return json(200, { ref: o.ref, state: r.state });
  } catch (e) { return fail(e); }
}
