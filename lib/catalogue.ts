// Data-access boundary: UI and API only use these functions. Swap the source here for a database.
import type { Product, Variant } from "./types";
export type { Variant };

export const categories = [
  { slug: "kurtis", name: "Kurtis", blurb: "Everyday and occasion kurtis." },
  { slug: "cord-sets", name: "Cord Sets", blurb: "Coordinated sets, ready to wear." },
  { slug: "sarees", name: "Sarees", blurb: "Sarees for every occasion." },
];
export const collections: Record<string, { name: string; blurb: string }> = {
  "new-arrivals": { name: "New Arrivals", blurb: "The latest additions to the boutique." },
  bestsellers: { name: "Bestsellers", blurb: "Customer favourites." },
};
export const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
export const effectivePrice = (p: Product) => (p.salePrice !== undefined && p.salePrice < p.price ? p.salePrice : p.price);
export const isOnSale = (p: Product) => effectivePrice(p) < p.price;
export const totalStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
export const inStock = (p: Product) => totalStock(p) > 0;
export const related = (all: Product[], p: Product, n = 4) => all.filter((x) => x.id !== p.id && x.category === p.category).slice(0, n);
export const featuredIn = (all: Product[], flag: "newArrival" | "bestseller", n = 4) => all.filter((p) => p[flag]).slice(0, n);

export type Sort = "featured" | "newest" | "price-asc" | "price-desc";
export type Query = { q: string; category: string[]; size: string[]; colour: string[]; min?: number; max?: number; inStock: boolean; sort: Sort; page: number };
export const PAGE_SIZE = 8;
const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const num = (v: string | string[] | undefined) => { const n = Number(arr(v)[0]); return arr(v)[0] !== undefined && Number.isFinite(n) && n >= 0 ? n : undefined; };
export function parseQuery(sp: Record<string, string | string[] | undefined>): Query {
  const sort = arr(sp.sort)[0] as Sort;
  const page = Math.floor(num(sp.page) ?? 1);
  return { q: (arr(sp.q)[0] ?? "").trim(), category: arr(sp.category), size: arr(sp.size), colour: arr(sp.colour), min: num(sp.min), max: num(sp.max),
    inStock: arr(sp.inStock)[0] === "1", sort: ["featured", "newest", "price-asc", "price-desc"].includes(sort) ? sort : "featured", page: page < 1 ? 1 : page };
}
export type Scope = { category?: string; collection?: string };
export function queryProducts(all: Product[], scope: Scope, q: Query) {
  const base = all.filter((p) => (!scope.category || p.category === scope.category) && (!scope.collection || p.collections.includes(scope.collection)));
  const facets = { sizes: [...new Set(base.flatMap((p) => p.variants.map((v) => v.size)))], colours: [...new Set(base.flatMap((p) => p.variants.map((v) => v.colour)))] };
  const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
  let items = base.filter((p) => {
    const hay = [p.name, p.description, categoryName(p.category), p.attributes.fabric, p.attributes.fit, ...p.variants.map((v) => v.colour)].join(" ").toLowerCase();
    const vOk = (v: Variant) => (!q.size.length || q.size.includes(v.size)) && (!q.colour.length || q.colour.includes(v.colour)) && (!q.inStock || v.stock > 0);
    const pr = effectivePrice(p);
    return terms.every((t) => hay.includes(t)) && (!q.category.length || q.category.includes(p.category)) && p.variants.some(vOk)
      && (q.min === undefined || pr >= q.min) && (q.max === undefined || pr <= q.max);
  });
  const s: Record<Sort, (a: Product, b: Product) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    "price-asc": (a, b) => effectivePrice(a) - effectivePrice(b), "price-desc": (a, b) => effectivePrice(b) - effectivePrice(a),
  };
  items = [...items].sort(s[q.sort]);
  const total = items.length, pages = Math.max(1, Math.ceil(total / PAGE_SIZE)), page = Math.min(q.page, pages);
  return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pages, facets };
}
export function buildHref(basePath: string, q: Query, page: number) {
  const u = new URLSearchParams();
  if (q.q) u.set("q", q.q); q.category.forEach((c) => u.append("category", c)); q.size.forEach((c) => u.append("size", c)); q.colour.forEach((c) => u.append("colour", c));
  if (q.min !== undefined) u.set("min", String(q.min)); if (q.max !== undefined) u.set("max", String(q.max));
  if (q.inStock) u.set("inStock", "1"); if (q.sort !== "featured") u.set("sort", q.sort); if (page > 1) u.set("page", String(page));
  const s = u.toString(); return s ? `${basePath}?${s}` : basePath;
}
