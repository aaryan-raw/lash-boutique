import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { computeShipping, getShipping } from "@/lib/orders";
import { validateCart } from "@/lib/pricing";
export async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => null)) as { items?: unknown; pincode?: unknown } | null;
    const cart = await validateCart(b?.items); const db = getDb();
    let shipping: number | null = null, error: string | null = null;
    if (!db) error = "checkout_not_configured";
    else { try { shipping = computeShipping(await getShipping(db), cart.subtotal, String(b?.pincode ?? "")); } catch (e) { error = (e as { code?: string; message: string }).message; } }
    return json(200, { ...cart, shipping, total: shipping === null ? null : cart.subtotal + shipping, shippingError: error });
  } catch (e) { return fail(e); }
}
