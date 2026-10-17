import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { changeStatus, OrderError, parseCheckout, placeOrder } from "@/lib/orders";
import { createGatewayOrder, paymentMethods } from "@/lib/payments";
import { notifyOrder } from "@/lib/notify";
export async function POST(req: Request) {
  try {
    const db = getDb(); const methods = paymentMethods();
    if (!db) return json(503, { error: "checkout_not_configured" });
    if (!methods.online && !methods.cod) return json(503, { error: "payments_not_configured" });
    const p = parseCheckout(await req.json().catch(() => null));
    if (!p.ok) return json(422, { error: "validation_failed", details: p.errors });
    const order = await placeOrder(db, p.value, methods);
    if (order.duplicate) return json(200, { order, duplicate: true });
    if (order.paymentMethod === "online") {
      try {
        const gatewayOrderId = await createGatewayOrder(order.ref, order.total);
        await db.query("update orders set gateway_order_id = $2 where id = $1", [order.id, gatewayOrderId]);
        return json(201, { order, razorpay: { keyId: process.env.RAZORPAY_KEY_ID, orderId: gatewayOrderId, amount: order.total * 100 } });
      } catch (e) { await changeStatus(db, order.id, "cancelled", "system", "Payment gateway unavailable").catch(() => {}); throw e instanceof OrderError ? e : new OrderError(502, "gateway_error"); }
    }
    await notifyOrder({ ref: order.ref, total: order.total, customerName: p.value.customer.name, customerEmail: p.value.customer.email, paymentMethod: "cod" });
    return json(201, { order });
  } catch (e) { return fail(e); }
}
