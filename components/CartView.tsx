"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CartResult } from "@/lib/pricing";
import { inr } from "@/lib/format";
import { useCart } from "./CartProvider";
import { Notice } from "./Section";
const msgs = { reduced: "Quantity reduced to available stock.", out_of_stock: "Currently out of stock.", unavailable: "No longer available." } as const;
export default function CartView() {
  const { items, ready, setQty, remove } = useCart();
  const [fetched, setData] = useState<CartResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!ready || !items.length) return;
    let live = true;
    fetch("/api/cart/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<CartResult>; })
      .then((d) => { if (!live) return; setError(""); setData(d); d.lines.forEach((l) => { const cur = items.find((i) => i.sku === l.sku); if (cur && l.status === "reduced" && cur.qty !== l.qty) setQty(l.sku, l.qty); }); })
      .catch(() => live && setError("We could not check stock and prices just now. Please try again."));
    return () => { live = false; };
  }, [items, ready, setQty]);
  const data = items.length ? fetched : null; // an empty cart never shows stale server data
  if (!ready) return <div className="container-page min-h-[60vh] max-w-3xl py-12" role="status" aria-busy="true">Loading your cart…</div>;
  if (!items.length) return <div className="container-page min-h-[60vh] max-w-3xl py-12"><h1 className="text-4xl md:text-5xl">Your cart</h1><p className="mt-4 text-muted">Your cart is empty.</p><Link href="/shop" className="btn-primary mt-6">Continue shopping</Link></div>;
  const blocked = data?.lines.some((l) => l.status === "out_of_stock" || l.status === "unavailable");
  return (
    <div className="container-page min-h-[60vh] max-w-3xl py-12">
      <h1 className="text-4xl md:text-5xl">Your cart</h1>
      {error && <p role="alert" className="mt-4 text-red-800">{error}</p>}
      {!data && !error && <p role="status" aria-busy="true" className="mt-4 text-muted">Checking stock and prices…</p>}
      {data && <ul className="mt-6 divide-y divide-line border-y border-line">{data.lines.map((l) => (
        <li key={l.sku} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div><p className="font-serif text-xl">{l.slug ? <Link href={`/product/${l.slug}`} className="hover:text-burgundy">{l.name}</Link> : l.name}</p>
            {l.size && <p className="text-sm text-muted">{l.colour} · {l.size} · {inr(l.unitPrice)} each</p>}
            {l.status !== "ok" && <p role="status" className="text-sm text-burgundy">{msgs[l.status]}</p>}</div>
          <div role="group" aria-label={`Quantity for ${l.name} ${l.size}`} className="flex items-center border border-line">
            <button className="btn-ghost px-3" aria-label={`Decrease quantity of ${l.name} ${l.size}`} onClick={() => setQty(l.sku, (items.find((i) => i.sku === l.sku)?.qty ?? 1) - 1)}>−</button>
            <output className="w-8 text-center">{l.status === "ok" || l.status === "reduced" ? l.qty : items.find((i) => i.sku === l.sku)?.qty}</output>
            <button className="btn-ghost px-3" aria-label={`Increase quantity of ${l.name} ${l.size}`} disabled={l.qty >= l.maxQty} onClick={() => setQty(l.sku, l.qty + 1)}>+</button></div>
          <div className="flex items-center justify-between gap-4 sm:justify-end"><span>{inr(l.lineTotal)}</span><button className="text-sm underline" onClick={() => remove(l.sku)} aria-label={`Remove ${l.name} ${l.size} from cart`}>Remove</button></div></li>))}</ul>}
      {data && <div className="mt-6 space-y-3"><p className="flex justify-between text-lg"><span>Subtotal</span><strong>{inr(data.subtotal)}</strong></p>
        <Notice>Shipping is calculated at checkout from your PIN code.</Notice>
        {blocked && <p role="alert" className="text-sm text-burgundy">Remove unavailable items to continue.</p>}
        <div className="flex flex-wrap gap-3"><Link href="/shop" className="btn-secondary">Continue shopping</Link>{blocked ? <button className="btn-primary" disabled>Checkout</button> : <Link href="/checkout" className="btn-primary">Checkout</Link>}</div></div>}
    </div>
  );
}
