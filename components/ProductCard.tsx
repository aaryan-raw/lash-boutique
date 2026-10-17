import Link from "next/link";
import type { Product } from "@/lib/types";
import { inStock } from "@/lib/catalogue";
import { MAX_LINE_QTY } from "@/lib/limits";
import ImagePlaceholder from "./ImagePlaceholder";
import Price from "./Price";
import QuickAdd from "./QuickAdd";
export default function ProductCard({ p }: { p: Product }) {
  const avail = p.variants.filter((v) => v.stock > 0);
  const single = avail.length === 1 && p.variants.length === 1 ? avail[0] : undefined;
  return (
    <article>
      <Link href={`/product/${p.slug}`} className="group block">
        <div className="relative overflow-hidden border border-line"><ImagePlaceholder label={p.images[0]?.alt ?? "Placeholder"} src={p.images[0]?.url} />{!inStock(p) && <span className="absolute left-2 top-2 bg-ink px-2 py-1 text-[11px] uppercase tracking-widest text-ivory">Out of stock</span>}</div>
        <div className="mt-3 flex flex-wrap gap-2">{p.newArrival && <span className="badge">New</span>}{p.bestseller && <span className="badge">Bestseller</span>}{p.devData && <span className="badge-demo">Sample</span>}</div>
        <h3 className="mt-2 text-xl group-hover:text-burgundy">{p.name}</h3>
      </Link>
      <Price p={p} />
      {single ? <QuickAdd sku={single.sku} name={p.name} max={Math.min(single.stock, MAX_LINE_QTY)} /> : inStock(p) ? <Link href={`/product/${p.slug}`} className="mt-2 inline-block text-sm text-burgundy underline-offset-4 hover:underline">Select options</Link> : null}
    </article>
  );
}
