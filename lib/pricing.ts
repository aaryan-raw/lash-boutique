// Server-side source of truth for cart lines and totals. Never trust client prices or stock.
import { effectivePrice } from "./catalogue";
import { findVariants } from "./products-repo";
import { MAX_LINE_QTY } from "./limits";
export { MAX_LINE_QTY };
export type LineStatus = "ok" | "reduced" | "out_of_stock" | "unavailable";
export type Line = { sku: string; slug: string; name: string; size: string; colour: string; imageAlt: string; unitPrice: number; requestedQty: number; qty: number; maxQty: number; lineTotal: number; status: LineStatus };
export type CartResult = { lines: Line[]; subtotal: number; currency: "INR"; shipping: null; discount: null };
export async function validateCart(input: unknown): Promise<CartResult> {
  const merged = new Map<string, number>();
  if (Array.isArray(input)) for (const it of input.slice(0, 50)) {
    if (it && typeof it === "object" && typeof (it as { sku: unknown }).sku === "string" && Number.isInteger((it as { qty: unknown }).qty) && (it as { qty: number }).qty > 0) {
      const { sku, qty } = it as { sku: string; qty: number }; merged.set(sku, (merged.get(sku) ?? 0) + qty);
    }
  }
  const found = await findVariants([...merged.keys()]);
  const lines: Line[] = [...merged].map(([sku, requested]) => {
    const hit = found.get(sku);
    if (!hit) return { sku, slug: "", name: "Item no longer available", size: "", colour: "", imageAlt: "", unitPrice: 0, requestedQty: requested, qty: 0, maxQty: 0, lineTotal: 0, status: "unavailable" as const };
    const { product: p, variant: v } = hit, maxQty = Math.min(v.stock, MAX_LINE_QTY), qty = Math.min(requested, maxQty), unit = effectivePrice(p);
    return { sku, slug: p.slug, name: p.name, size: v.size, colour: v.colour, imageAlt: p.images[0]?.alt ?? p.name, unitPrice: unit, requestedQty: requested, qty, maxQty, lineTotal: unit * qty,
      status: maxQty === 0 ? "out_of_stock" as const : qty < requested ? "reduced" as const : "ok" as const };
  });
  // No shipping or discount rules are configured yet; they stay null rather than invented.
  return { lines, subtotal: lines.reduce((s, l) => s + l.lineTotal, 0), currency: "INR", shipping: null, discount: null };
}
