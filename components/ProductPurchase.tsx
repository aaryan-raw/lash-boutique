"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { MAX_LINE_QTY } from "@/lib/limits";
import { useCart } from "./CartProvider";
export default function ProductPurchase({ product, waHref }: { product: Product; waHref: string }) {
  const { add, items } = useCart();
  const colours = useMemo(() => [...new Set(product.variants.map((v) => v.colour))], [product]);
  const [colour, setColour] = useState(colours.length === 1 ? colours[0] : "");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const forColour = product.variants.filter((v) => !colour || v.colour === colour);
  const variant = product.variants.find((v) => v.sku === sku);
  const inCart = items.find((i) => i.sku === sku)?.qty ?? 0;
  const room = variant ? Math.max(0, Math.min(variant.stock, MAX_LINE_QTY) - inCart) : 0;
  const anyStock = product.variants.some((v) => v.stock > 0);
  const choose = (s: string) => { setSku(s); setQty(1); setMsg(""); };
  return (
    <div>
      {colours.length > 1 && <fieldset className="mb-5"><legend className="field-label">Colour</legend><div className="flex flex-wrap gap-2">{colours.map((c) => (
        <button key={c} type="button" aria-pressed={colour === c} className={`btn ${colour === c ? "border-burgundy bg-burgundy text-ivory" : "border-line"}`} onClick={() => { setColour(c); setSku(""); setMsg(""); }}>{c}</button>))}</div></fieldset>}
      <fieldset className="mb-5"><legend className="field-label">Size{colour === "" && colours.length > 1 ? " (choose a colour first)" : ""}</legend>
        <div className="flex flex-wrap gap-2">{forColour.map((v) => (
          <button key={v.sku} type="button" disabled={v.stock === 0 || (colours.length > 1 && !colour)} aria-pressed={sku === v.sku} onClick={() => choose(v.sku)}
            className={`btn min-w-[3rem] px-4 ${sku === v.sku ? "border-burgundy bg-burgundy text-ivory" : "border-line"} disabled:line-through`}>{v.size}{v.stock === 0 && <span className="sr-only"> (sold out)</span>}</button>))}</div></fieldset>
      <p className="mb-4 text-sm" role="status">{!anyStock ? "Out of stock" : variant ? (variant.stock <= 3 ? `Only ${variant.stock} left` : "In stock") : "Select a size to see availability"}</p>
      <div className="mb-5 flex items-center gap-3"><span className="field-label mb-0" id="qty-label">Quantity</span>
        <div role="group" aria-labelledby="qty-label" className="flex items-center border border-line">
          <button type="button" className="btn-ghost px-3" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button>
          <output aria-live="polite" className="w-10 text-center">{qty}</output>
          <button type="button" className="btn-ghost px-3" aria-label="Increase quantity" disabled={!variant || qty >= room} onClick={() => setQty(qty + 1)}>+</button></div></div>
      <button type="button" className="btn-primary w-full sm:w-auto" disabled={!variant || room === 0 || qty > room}
        onClick={() => { add(sku, qty); setMsg(`Added ${qty} to cart`); setQty(1); }}>{!anyStock ? "Out of stock" : !variant ? "Select a size" : room === 0 ? "Maximum in cart" : "Add to cart"}</button>
      <p role="status" className="mt-2 text-sm text-sage-dark">{msg}{msg && <> · <Link href="/cart" className="underline">View cart</Link></>}</p>
      <div className="mt-8 space-y-2 border-t border-line pt-5 text-sm">
        <p>Delivery information will be added once confirmed by the boutique.</p>
        <p>Read our <Link href="/returns" className="underline">returns and exchange policy</Link> (pending owner text).</p>
        <p><a href={waHref} className="btn-secondary mt-2" target="_blank" rel="noopener noreferrer">Ask on WhatsApp about this item</a></p>
      </div>
    </div>
  );
}
