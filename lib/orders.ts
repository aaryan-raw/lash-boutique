import { randomBytes, randomUUID } from "node:crypto";
import type { Db, Q } from "./db";
import { MAX_LINE_QTY } from "./limits";

export type Status = "pending_payment" | "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
export type Shipping = { flatRate: number; freeOver: number | null; pinPrefixes: string[] };
export type PayMethod = "online" | "cod";
export const TRANSITIONS: Record<Status, Status[]> = {
  pending_payment: ["cancelled"], // becomes confirmed ONLY via verified payment, never by hand
  placed: ["confirmed", "cancelled"], confirmed: ["packed", "cancelled"], packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"], delivered: ["returned"], cancelled: [], returned: [],
};
export const canTransition = (from: Status, to: Status) => TRANSITIONS[from]?.includes(to) ?? false;
const RESTOCK_FROM: Status[] = ["pending_payment", "placed", "confirmed", "packed"];

export class OrderError extends Error { constructor(public status: number, public code: string, public details?: unknown) { super(code); } }

export async function getShipping(q: Q): Promise<Shipping | null> {
  const r = (await q.query<{ value: Shipping }>("select value from settings where key = 'shipping'")).rows[0];
  return r?.value ?? null;
}
export function computeShipping(s: Shipping | null, subtotal: number, pin: string): number {
  if (!s) throw new OrderError(503, "shipping_not_configured");
  if (!/^\d{6}$/.test(pin) || !s.pinPrefixes.some((p) => pin.startsWith(p))) throw new OrderError(422, "not_serviceable");
  return s.freeOver !== null && subtotal >= s.freeOver ? 0 : s.flatRate;
}

export type CheckoutInput = { items: { sku: string; qty: number }[]; customer: { name: string; phone: string; email?: string }; address: { line1: string; line2?: string; city: string; state: string; pincode: string }; paymentMethod: PayMethod; consent: true; idempotencyKey: string };
const str = (v: unknown, min: number, max: number) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;
export function parseCheckout(raw: unknown): { ok: true; value: CheckoutInput } | { ok: false; errors: Record<string, string> } {
  const r = (raw ?? {}) as Record<string, any>;
  const errors: Record<string, string> = {};
  const name = str(r.customer?.name, 2, 80); if (!name) errors.name = "Enter your full name";
  const digits = String(r.customer?.phone ?? "").replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) errors.phone = "Enter a valid 10-digit Indian mobile number";
  const email = r.customer?.email ? String(r.customer.email).trim() : undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email";
  const line1 = str(r.address?.line1, 3, 120); if (!line1) errors.line1 = "Enter your address";
  const city = str(r.address?.city, 2, 60); if (!city) errors.city = "Enter your city";
  const state = str(r.address?.state, 2, 60); if (!state) errors.state = "Enter your state";
  const pincode = String(r.address?.pincode ?? "").trim(); if (!/^\d{6}$/.test(pincode)) errors.pincode = "Enter a 6-digit PIN code";
  const line2 = (r.address?.line2 ? str(r.address.line2, 1, 120) : undefined) ?? undefined; if (r.address?.line2 && !line2) errors.line2 = "Address line 2 is too long";
  if (r.paymentMethod !== "online" && r.paymentMethod !== "cod") errors.paymentMethod = "Choose a payment method";
  if (r.consent !== true) errors.consent = "Please agree to the use of your details to process this order";
  const idem = typeof r.idempotencyKey === "string" && /^[A-Za-z0-9-]{16,64}$/.test(r.idempotencyKey) ? r.idempotencyKey : null; if (!idem) errors.idempotencyKey = "Invalid request";
  const items = Array.isArray(r.items) && r.items.length > 0 && r.items.length <= 30 && r.items.every((i: any) => typeof i?.sku === "string" && Number.isInteger(i?.qty) && i.qty >= 1 && i.qty <= MAX_LINE_QTY) ? r.items.map((i: any) => ({ sku: i.sku as string, qty: i.qty as number })) : null;
  if (!items) errors.items = "Your cart is empty or invalid";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { items: items!, customer: { name: name!, phone: digits, email }, address: { line1: line1!, line2, city: city!, state: state!, pincode }, paymentMethod: r.paymentMethod, consent: true, idempotencyKey: idem! } };
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeRef = () => "LB-" + [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
type LineRow = { sku: string; size: string; colour: string; name: string; price: number; sale_price: number | null };
export type PlacedOrder = { id: string; ref: string; total: number; status: Status; paymentMethod: PayMethod; duplicate: boolean };

/** Server-authoritative order placement. Prices and totals come from the database; client-sent prices are never read. */
export async function placeOrder(db: Db, input: CheckoutInput, methods: { online: boolean; cod: boolean }): Promise<PlacedOrder> {
  if (!methods[input.paymentMethod]) throw new OrderError(422, "payment_method_unavailable");
  const dup = async (q: Q) => (await q.query<{ id: string; ref: string; total: number; status: Status; payment_method: PayMethod }>("select id, ref, total, status, payment_method from orders where idem_key = $1", [input.idempotencyKey])).rows[0];
  const asPlaced = (o: NonNullable<Awaited<ReturnType<typeof dup>>>, duplicate: boolean): PlacedOrder => ({ id: o.id, ref: o.ref, total: o.total, status: o.status, paymentMethod: o.payment_method, duplicate });
  try {
    return await db.tx(async (q) => {
      const existing = await dup(q); if (existing) return asPlaced(existing, true);
      const merged = new Map<string, number>(); for (const i of input.items) merged.set(i.sku, (merged.get(i.sku) ?? 0) + i.qty);
      const lines: (LineRow & { qty: number; unit: number })[] = [];
      for (const [sku, qty] of merged) {
        if (qty > MAX_LINE_QTY) throw new OrderError(422, "quantity_too_high", { sku });
        const row = (await q.query<LineRow>("select v.sku, v.size, v.colour, p.name, p.price, p.sale_price from variants v join products p on p.id = v.product_id where v.sku = $1 and p.status = 'active'", [sku])).rows[0];
        if (!row) throw new OrderError(409, "item_unavailable", { sku });
        const taken = await q.query("update variants set stock = stock - $2 where sku = $1 and stock >= $2", [sku, qty]);
        if (taken.rowCount === 0) throw new OrderError(409, "insufficient_stock", { sku });
        const unit = row.sale_price !== null && row.sale_price < row.price ? row.sale_price : row.price;
        lines.push({ ...row, qty, unit });
      }
      const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
      const shipping = computeShipping(await getShipping(q), subtotal, input.address.pincode);
      const total = subtotal + shipping;
      const id = randomUUID(), ref = makeRef(), status: Status = input.paymentMethod === "cod" ? "placed" : "pending_payment";
      await q.query("insert into orders (id, ref, status, payment_method, payment_status, customer, address, subtotal, shipping, discount, total, idem_key, consent_at) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,0,$10,$11, now())",
        [id, ref, status, input.paymentMethod, input.paymentMethod === "cod" ? "cod_due" : "unpaid", JSON.stringify(input.customer), JSON.stringify(input.address), subtotal, shipping, total, input.idempotencyKey]);
      for (const l of lines) await q.query("insert into order_items (order_id, sku, name, size, colour, unit_price, qty) values ($1,$2,$3,$4,$5,$6,$7)", [id, l.sku, l.name, l.size, l.colour, l.unit, l.qty]);
      await q.query("insert into order_events (order_id, status, note, actor) values ($1,$2,$3,'customer')", [id, status, "Order placed"]);
      return { id, ref, total, status, paymentMethod: input.paymentMethod, duplicate: false };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") { const o = await dup(db); if (o) return asPlaced(o, true); }
    throw e;
  }
}

export async function changeStatus(db: Db, orderId: string, to: Status, actor: string, note = ""): Promise<{ from: Status; refundCheckNeeded: boolean }> {
  return db.tx(async (q) => {
    const o = (await q.query<{ status: Status; payment_status: string }>("select status, payment_status from orders where id = $1 for update", [orderId])).rows[0];
    if (!o) throw new OrderError(404, "order_not_found");
    if (!canTransition(o.status, to)) throw new OrderError(409, "invalid_transition", { from: o.status, to });
    if (to === "cancelled" && RESTOCK_FROM.includes(o.status)) {
      const items = (await q.query<{ sku: string; qty: number }>("select sku, qty from order_items where order_id = $1", [orderId])).rows;
      for (const i of items) await q.query("update variants set stock = stock + $2 where sku = $1", [i.sku, i.qty]);
    }
    await q.query("update orders set status = $2, updated_at = now() where id = $1", [orderId, to]);
    await q.query("insert into order_events (order_id, status, note, actor) values ($1,$2,$3,$4)", [orderId, to, note.slice(0, 500), actor]);
    return { from: o.status, refundCheckNeeded: to === "cancelled" && o.payment_status === "paid" };
  });
}

/** Cancels unpaid online orders older than `minutes`, releasing reserved stock. Call from a scheduler. */
export async function expirePending(db: Db, minutes: number): Promise<number> {
  const ids = (await db.query<{ id: string }>("select id from orders where status = 'pending_payment' and created_at < now() - ($1 || ' minutes')::interval", [String(minutes)])).rows;
  for (const { id } of ids) await changeStatus(db, id, "cancelled", "system", "Payment not completed in time");
  return ids.length;
}
