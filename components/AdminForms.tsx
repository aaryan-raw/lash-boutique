"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
async function send(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) as Record<string, any> };
}
const explain = (d: Record<string, any>) => d.details ? Object.values(d.details).join(" ") : String(d.error ?? "Failed");
export function LoginForm() {
  const [m, setM] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  return (<form className="mx-auto max-w-sm space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const f = new FormData(e.currentTarget);
    const r = await send("/api/admin/login", "POST", { email: f.get("email"), password: f.get("password") }); setBusy(false);
    if (r.ok) router.push("/admin/orders"); else setM(r.data.error === "admin_not_configured" ? "Admin login is not configured on this server." : r.data.error === "too_many_attempts" ? "Too many attempts. Try again later." : "Incorrect email or password."); }}>
    <div><label htmlFor="email" className="field-label">Email</label><input id="email" name="email" type="email" required className="field" autoComplete="username" /></div>
    <div><label htmlFor="password" className="field-label">Password</label><input id="password" name="password" type="password" required className="field" autoComplete="current-password" /></div>
    <button className="btn-primary w-full" disabled={busy}>Sign in</button><p role="alert" className="text-sm text-red-800">{m}</p></form>);
}
export function LogoutButton() { const router = useRouter(); return <button className="btn-ghost" onClick={async () => { await send("/api/admin/logout", "POST", {}); router.push("/admin/login"); }}>Sign out</button>; }
export function StatusActions({ id, options }: { id: string; options: string[] }) {
  const router = useRouter(); const [note, setNote] = useState(""); const [m, setM] = useState(""); const [busy, setBusy] = useState(false);
  if (!options.length) return <p className="text-sm text-muted">No further status changes are possible.</p>;
  return (<div><label htmlFor="note" className="field-label">Note (e.g. courier and tracking number, typed manually)</label><input id="note" className="field mb-3" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
    <div className="flex flex-wrap gap-2">{options.map((s) => <button key={s} className={s === "cancelled" || s === "returned" ? "btn-secondary" : "btn-primary"} disabled={busy} onClick={async () => {
      if ((s === "cancelled" || s === "returned") && !confirm(`Mark this order as ${s}?`)) return; setBusy(true);
      const r = await send(`/api/admin/orders/${id}/status`, "POST", { status: s, note }); setBusy(false);
      if (r.ok) { setM(r.data.refundCheckNeeded ? "Cancelled. This order was paid online: refund it in the Razorpay dashboard." : "Updated."); router.refresh(); } else setM(explain(r.data)); }}>Mark {s.replace("_", " ")}</button>)}</div>
    <p role="status" className="mt-2 text-sm">{m}</p></div>);
}
type P = { id?: string; slug: string; name: string; description: string; category: string; collections: string[]; price: number; salePrice?: number; images: { alt: string; url?: string }[]; variants: { sku: string; size: string; colour: string; stock: number }[]; attributes: { fabric?: string; fit?: string; care?: string }; featured: boolean; newArrival: boolean; bestseller: boolean; status: "active" | "inactive" };
export function ProductForm({ p, categories }: { p?: P; categories: { slug: string; name: string }[] }) {
  const router = useRouter(); const [m, setM] = useState(""); const [busy, setBusy] = useState(false);
  const col = (n: string) => p?.collections.includes(n);
  return (<form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? "");
    const variants = g("variants").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [sku, size, colour, stock] = l.split(",").map((x) => x.trim()); return { sku, size, colour, stock: Number(stock) }; });
    const images = g("images").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [alt, url] = l.split("|").map((x) => x.trim()); return { alt, url: url || undefined }; });
    const body = { name: g("name"), slug: g("slug"), description: g("description"), category: g("category"), price: Number(g("price")), salePrice: g("salePrice") ? Number(g("salePrice")) : null,
      collections: [f.get("c_new") && "new-arrivals", f.get("c_best") && "bestsellers"].filter(Boolean), featured: !!f.get("featured"), newArrival: !!f.get("c_new"), bestseller: !!f.get("c_best"), status: g("status"), variants, images, attributes: { fabric: g("fabric"), fit: g("fit"), care: g("care") } };
    const r = await send(p?.id ? `/api/admin/products/${p.id}` : "/api/admin/products", p?.id ? "PUT" : "POST", body); setBusy(false);
    if (r.ok) { setM("Saved."); router.push("/admin/products"); router.refresh(); } else setM(explain(r.data)); }}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label htmlFor="name" className="field-label">Name</label><input id="name" name="name" defaultValue={p?.name} required className="field" /></div>
      <div><label htmlFor="slug" className="field-label">URL slug</label><input id="slug" name="slug" defaultValue={p?.slug} required className="field" /></div>
      <div><label htmlFor="category" className="field-label">Category</label><select id="category" name="category" defaultValue={p?.category ?? categories[0].slug} className="field">{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
      <div><label htmlFor="status" className="field-label">Status</label><select id="status" name="status" defaultValue={p?.status ?? "inactive"} className="field"><option value="active">Published</option><option value="inactive">Archived / draft</option></select></div>
      <div><label htmlFor="price" className="field-label">Price (INR)</label><input id="price" name="price" type="number" min={0} defaultValue={p?.price} required className="field" /></div>
      <div><label htmlFor="salePrice" className="field-label">Sale price (optional)</label><input id="salePrice" name="salePrice" type="number" min={0} defaultValue={p?.salePrice} className="field" /></div></div>
    <div><label htmlFor="description" className="field-label">Description</label><textarea id="description" name="description" defaultValue={p?.description} rows={4} className="field py-2" /></div>
    <div className="grid gap-4 sm:grid-cols-3">{(["fabric", "fit", "care"] as const).map((k) => <div key={k}><label htmlFor={k} className="field-label capitalize">{k}</label><input id={k} name={k} defaultValue={p?.attributes[k]} className="field" /></div>)}</div>
    <div><label htmlFor="variants" className="field-label">Variants: one per line as SKU, size, colour, stock</label><textarea id="variants" name="variants" rows={5} required defaultValue={p?.variants.map((v) => `${v.sku}, ${v.size}, ${v.colour}, ${v.stock}`).join("\n")} className="field py-2 font-mono" /></div>
    <div><label htmlFor="images" className="field-label">Images: one per line as alt text | https image URL (URL optional; first is the main image)</label><textarea id="images" name="images" rows={3} defaultValue={p?.images.map((i) => `${i.alt}${i.url ? ` | ${i.url}` : ""}`).join("\n")} className="field py-2" /></div>
    <div className="flex flex-wrap gap-6 text-sm"><label className="flex gap-2"><input type="checkbox" name="featured" defaultChecked={p?.featured} />Featured</label><label className="flex gap-2"><input type="checkbox" name="c_new" defaultChecked={p?.newArrival || col("new-arrivals")} />New arrival</label><label className="flex gap-2"><input type="checkbox" name="c_best" defaultChecked={p?.bestseller || col("bestsellers")} />Bestseller</label></div>
    <button className="btn-primary" disabled={busy}>Save product</button><p role="status" className="text-sm">{m}</p></form>);
}
export function ShippingForm({ s }: { s: { flatRate: number; freeOver: number | null; pinPrefixes: string[] } | null }) {
  const [m, setM] = useState("");
  return (<form className="max-w-md space-y-4" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget);
    const r = await send("/api/admin/settings/shipping", "PUT", { flatRate: Number(f.get("flatRate")), freeOver: f.get("freeOver") ? Number(f.get("freeOver")) : null, pinPrefixes: String(f.get("pins")).split(",").map((x) => x.trim()).filter(Boolean) }); setM(r.ok ? "Saved." : explain(r.data)); }}>
    <div><label htmlFor="flatRate" className="field-label">Flat shipping charge (INR, 0 for free)</label><input id="flatRate" name="flatRate" type="number" min={0} defaultValue={s?.flatRate} required className="field" /></div>
    <div><label htmlFor="freeOver" className="field-label">Free shipping above subtotal (INR, optional)</label><input id="freeOver" name="freeOver" type="number" min={0} defaultValue={s?.freeOver ?? undefined} className="field" /></div>
    <div><label htmlFor="pins" className="field-label">Delivery areas: PIN code prefixes, comma separated</label><input id="pins" name="pins" defaultValue={s?.pinPrefixes.join(", ")} required className="field" placeholder="e.g. 695, 686" /></div>
    <button className="btn-primary">Save shipping settings</button><p role="status" className="text-sm">{m}</p></form>);
}
