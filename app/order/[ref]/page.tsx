import { notFound } from "next/navigation";
import PayButton from "@/components/PayButton";
import { Notice } from "@/components/Section";
import { getDb } from "@/lib/db";
import { inr } from "@/lib/format";
export const metadata = { title: "Order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const label: Record<string, string> = { pending_payment: "Awaiting payment", placed: "Received, awaiting confirmation", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", returned: "Returned" };
export default async function OrderPage(props: { params: Promise<{ ref: string }> }) {
  const params = await props.params;
  const db = getDb(); if (!db) notFound();
  const o = (await db.query<{ id: string; ref: string; status: string; payment_method: string; payment_status: string; subtotal: number; shipping: number; total: number }>("select id, ref, status, payment_method, payment_status, subtotal, shipping, total from orders where ref = $1", [params.ref])).rows[0];
  if (!o) notFound();
  const items = (await db.query<{ name: string; size: string; qty: number; unit_price: number }>("select name, size, qty, unit_price from order_items where order_id = $1", [o.id])).rows;
  // Deliberately excludes phone, email and address: the order reference alone must not reveal customer details.
  return (
    <div className="container-page max-w-2xl py-12"><h1 className="text-4xl md:text-5xl">Order {o.ref}</h1>
      <p className="mt-2 text-lg" role="status">Status: {label[o.status] ?? o.status}</p>
      {o.status === "pending_payment" && <div className="my-5"><Notice>Your items are held for a short time while payment is completed.</Notice><div className="mt-4"><PayButton orderRef={o.ref} /></div></div>}
      {o.status === "placed" && <div className="my-5"><Notice>Cash on delivery. The store will confirm your order.</Notice></div>}
      <ul className="mt-6 divide-y divide-line border-y border-line">{items.map((i, n) => <li key={n} className="flex justify-between py-3"><span>{i.name} · {i.size} × {i.qty}</span><span>{inr(i.unit_price * i.qty)}</span></li>)}</ul>
      <p className="mt-4 flex justify-between"><span>Shipping</span><span>{o.shipping === 0 ? "Free" : inr(o.shipping)}</span></p>
      <p className="mt-1 flex justify-between text-lg font-medium"><span>Total</span><span>{inr(o.total)}</span></p>
      <p className="mt-6 text-sm text-muted">Keep this reference to contact the store about your order.</p></div>
  );
}
