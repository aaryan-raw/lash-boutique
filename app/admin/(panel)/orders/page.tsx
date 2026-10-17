import Link from "next/link";
import { Notice } from "@/components/Section";
import { adminDb, requireAdminPage } from "@/lib/admin-page";
import { listOrders } from "@/lib/admin-service";
import { inr } from "@/lib/format";
export default async function Orders(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdminPage(); const db = adminDb();
  if (!db) return <Notice>The database is not connected (DATABASE_URL).</Notice>;
  const rows = await listOrders(db, searchParams);
  return (<div><h1 className="mb-4 text-3xl">Orders</h1>
    <form className="mb-6 flex flex-wrap gap-2"><input name="q" defaultValue={searchParams.q} placeholder="Reference, name or phone" aria-label="Search orders" className="field max-w-xs" />
      <select name="status" defaultValue={searchParams.status} aria-label="Status" className="field max-w-[12rem]"><option value="">All statuses</option>{["pending_payment", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"].map((s) => <option key={s} value={s}>{s}</option>)}</select><button className="btn-secondary">Filter</button></form>
    {rows.length === 0 ? <p className="text-muted">No orders found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2">Ref</th><th>Customer</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
      <tbody>{rows.map((o) => <tr key={o.id} className="border-b border-line"><td className="py-2"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.ref}</Link></td><td>{o.customer_name}</td><td>{o.status}</td><td>{o.payment_method} / {o.payment_status}</td><td className="text-right">{inr(o.total)}</td></tr>)}</tbody></table></div>}</div>);
}
