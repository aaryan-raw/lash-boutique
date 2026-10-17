import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";
export async function POST(req: Request) {
  try {
    const db = getDb(); const b = (await req.json().catch(() => null)) as { ref?: string } | null;
    if (!db || !process.env.RAZORPAY_KEY_ID) return json(503, { error: "payments_not_configured" });
    const o = (await db.query<{ total: number; gateway_order_id: string }>("select total, gateway_order_id from orders where ref = $1 and status = 'pending_payment' and gateway_order_id is not null", [String(b?.ref ?? "")])).rows[0];
    if (!o) return json(404, { error: "nothing_to_pay" });
    return json(200, { razorpay: { keyId: process.env.RAZORPAY_KEY_ID, orderId: o.gateway_order_id, amount: o.total * 100 } });
  } catch (e) { return fail(e); }
}
