"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
// Only rendered when a product has exactly one purchasable variant (no choice needed).
export default function QuickAdd({ sku, name, max }: { sku: string; name: string; max: number }) {
  const { add, items } = useCart();
  const [done, setDone] = useState(false);
  const inCart = items.find((i) => i.sku === sku)?.qty ?? 0;
  const full = inCart >= max;
  return (
    <div className="mt-2">
      <button type="button" className="btn-secondary min-h-[40px] w-full" disabled={full} onClick={() => { add(sku, 1); setDone(true); }} aria-label={`Quick add ${name} to cart`}>{full ? "Maximum in cart" : "Quick add"}</button>
      <p role="status" className="text-xs text-sage-dark">{done ? "Added to cart" : ""}</p>
    </div>
  );
}
