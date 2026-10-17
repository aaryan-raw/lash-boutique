import { notFound } from "next/navigation";
import { StatusActions } from "@/components/AdminForms";
import { Notice } from "@/components/Section";
import { adminDb, requireAdminPage } from "@/lib/admin-page";
import { getOrder } from "@/lib/admin-service";
import { inr } from "@/lib/format";
import { TRANSITIONS, type Status } from "@/lib/orders";
export default async function OrderDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requireAdminPage(); const db = adminDb(); if (!db) return <Notice>The database is not connected.</Notice>;
  const d = await getOrder(db, params.id); if (!d) notFound();
  const { order: o, items, events } = d; const c = o.customer, a = o.address;
  return (<div className="space-y-6"><h1 className="text-3xl">Order {o.ref}</h1>
    <p>Status: <strong>{o.status}</strong> · Payment: {o.payment_method} / {o.payment_status} · Total {inr(o.total)} (shipping {inr(o.shipping)})</p>
    {o.payment_status === "paid_after_cancel" && <Notice>Payment arrived after this order was cancelled. Refund it in the Razorpay dashboard.</Notice>}
    <section><h2 className="text-xl">Customer</h2><p>{c.name} · <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a>{c.email && <> · {c.email}</>}</p><address className="not-italic text-muted">{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.pincode}</address></section>
    <section><h2 className="text-xl">Items</h2><ul>{items.map((i, n) => <li key={n}>{i.name} · {i.size} · {i.sku} × {i.qty} @ {inr(i.unit_price)}</li>)}</ul></section>
    <section><h2 className="mb-2 text-xl">Update status</h2><StatusActions id={o.id} options={(TRANSITIONS[o.status as Status] ?? []).filter(() => true)} /></section>
    <section><h2 className="text-xl">History</h2><ul className="text-sm">{events.map((e) => <li key={e.id}>{new Date(e.at).toLocaleString("en-IN")} · {e.status} · {e.actor}{e.note && ` · ${e.note}`}</li>)}</ul></section></div>);
}
