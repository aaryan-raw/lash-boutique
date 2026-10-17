import Link from "next/link";
import { Notice } from "@/components/Section";
import { adminDb, requireAdminPage } from "@/lib/admin-page";
import { listProductsAdmin } from "@/lib/admin-service";
import { inr } from "@/lib/format";
export default async function Products() {
  await requireAdminPage(); const db = adminDb(); if (!db) return <Notice>The database is not connected.</Notice>;
  const ps = await listProductsAdmin(db);
  return (<div><div className="mb-4 flex items-center justify-between"><h1 className="text-3xl">Products</h1><Link href="/admin/products/new" className="btn-primary">New product</Link></div>
    {ps.length === 0 ? <p className="text-muted">No products yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2">Name</th><th>Status</th><th>Price</th><th>Stock</th></tr></thead>
      <tbody>{ps.map((p) => <tr key={p.id} className="border-b border-line"><td className="py-2"><Link className="underline" href={`/admin/products/${p.id}`}>{p.name}</Link></td><td>{p.status === "active" ? "Published" : "Archived/draft"}</td><td>{inr(p.salePrice ?? p.price)}</td><td>{p.variants.reduce((s, v) => s + v.stock, 0)}</td></tr>)}</tbody></table></div>}</div>);
}
