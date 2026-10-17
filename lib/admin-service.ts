import { randomUUID } from "node:crypto";
import type { Db } from "./db";
import { categories, collections } from "./catalogue";
import { loadProducts } from "./products-repo";
import { OrderError, type Shipping } from "./orders";
import type { Product } from "./types";

export type ProductInput = Omit<Product, "id" | "createdAt" | "devData">;
const err = (field: string, msg: string): never => { throw new OrderError(422, "validation_failed", { [field]: msg }); };
const int = (v: unknown, f: string, min = 0) => (Number.isInteger(v) && (v as number) >= min ? (v as number) : err(f, `${f} must be a whole number of at least ${min}`));
export function parseProduct(raw: unknown): ProductInput {
  const r = (raw ?? {}) as Record<string, any>;
  const name = typeof r.name === "string" && r.name.trim().length >= 2 && r.name.length <= 120 ? r.name.trim() : err("name", "Name is required");
  const slug = typeof r.slug === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug) && r.slug.length <= 100 ? r.slug : err("slug", "Slug must be lowercase letters, numbers and hyphens");
  if (!categories.some((c) => c.slug === r.category)) err("category", "Unknown category");
  const price = int(r.price, "price"); const salePrice = r.salePrice === undefined || r.salePrice === null || r.salePrice === "" ? undefined : int(r.salePrice, "salePrice");
  if (salePrice !== undefined && salePrice >= price) err("salePrice", "Sale price must be lower than the price");
  const cols = Array.isArray(r.collections) ? r.collections : []; if (!cols.every((c: string) => c in collections)) err("collections", "Unknown collection");
  const variants = Array.isArray(r.variants) && r.variants.length > 0 && r.variants.length <= 60 ? r.variants : err("variants", "At least one variant is required");
  const seen = new Set<string>();
  const vs = variants.map((v: any) => {
    const sku = typeof v?.sku === "string" && /^[A-Za-z0-9._-]{2,40}$/.test(v.sku) ? v.sku : err("variants", "Invalid SKU");
    if (seen.has(sku)) err("variants", `Duplicate SKU ${sku}`); seen.add(sku);
    const size = typeof v.size === "string" && v.size.trim() ? v.size.trim().slice(0, 20) : err("variants", "Size is required");
    const colour = typeof v.colour === "string" && v.colour.trim() ? v.colour.trim().slice(0, 30) : err("variants", "Colour is required");
    return { sku, size, colour, stock: int(v.stock, "stock") };
  });
  const images = (Array.isArray(r.images) ? r.images : []).slice(0, 12).map((im: any, i: number) => {
    const alt = typeof im?.alt === "string" && im.alt.trim() ? im.alt.trim().slice(0, 200) : err("images", "Every image needs alt text");
    if (im.url) { try { if (new URL(im.url).protocol !== "https:") throw 0; } catch { err("images", "Image URL must be https"); } }
    return { id: `${slug}-${i}`, alt, ...(im.url ? { url: String(im.url) } : {}) };
  });
  const a = r.attributes ?? {}; const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : undefined);
  return { name, slug, description: typeof r.description === "string" ? r.description.slice(0, 4000) : "", category: r.category, collections: cols, price, salePrice, images, variants: vs,
    attributes: { fabric: t(a.fabric), fit: t(a.fit), care: t(a.care) }, featured: !!r.featured, newArrival: !!r.newArrival, bestseller: !!r.bestseller, status: r.status === "inactive" ? "inactive" : "active" };
}
export async function upsertProduct(db: Db, input: ProductInput, id?: string): Promise<string> {
  return db.tx(async (q) => {
    const pid = id ?? randomUUID();
    const vals = [pid, input.slug, input.name, input.description, input.category, JSON.stringify(input.collections), input.price, input.salePrice ?? null, JSON.stringify(input.images), JSON.stringify(input.attributes), input.featured, input.newArrival, input.bestseller, input.status];
    if (id) {
      const r = await q.query("update products set slug=$2, name=$3, description=$4, category=$5, collections=$6::jsonb, price=$7, sale_price=$8, images=$9::jsonb, attributes=$10::jsonb, featured=$11, new_arrival=$12, bestseller=$13, status=$14 where id=$1", vals);
      if (r.rowCount === 0) throw new OrderError(404, "product_not_found");
    } else await q.query("insert into products (id, slug, name, description, category, collections, price, sale_price, images, attributes, featured, new_arrival, bestseller, status) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14)", vals);
    for (const v of input.variants) await q.query("insert into variants (sku, product_id, size, colour, stock) values ($1,$2,$3,$4,$5) on conflict (sku) do update set size=excluded.size, colour=excluded.colour, stock=excluded.stock where variants.product_id = excluded.product_id", [v.sku, pid, v.size, v.colour, v.stock]);
    const dupe = await q.query("select 1 from variants where product_id <> $1 and sku = any($2)", [pid, input.variants.map((v) => v.sku)]);
    if (dupe.rowCount) throw new OrderError(409, "sku_in_use");
    await q.query("delete from variants where product_id = $1 and not (sku = any($2))", [pid, input.variants.map((v) => v.sku)]);
    return pid;
  });
}
export const listProductsAdmin = (db: Db) => loadProducts(db, false);
export async function listOrders(db: Db, f: { q?: string; status?: string }) {
  const like = `%${(f.q ?? "").replace(/[\\%_]/g, "\\$&")}%`;
  return (await db.query<{ id: string; ref: string; status: string; payment_method: string; payment_status: string; total: number; customer_name: string; created_at: string }>(
    "select id, ref, status, payment_method, payment_status, total, customer->>'name' as customer_name, created_at from orders where ($1 = '' or ref ilike $2 or customer->>'name' ilike $2 or customer->>'phone' like $2) and ($3 = '' or status = $3) order by created_at desc limit 100", [f.q ?? "", like, f.status ?? ""])).rows;
}
export async function getOrder(db: Db, id: string) {
  const o = (await db.query<Record<string, any>>("select * from orders where id = $1", [id])).rows[0];
  if (!o) return null;
  return { order: o, items: (await db.query<Record<string, any>>("select * from order_items where order_id = $1", [id])).rows, events: (await db.query<Record<string, any>>("select * from order_events where order_id = $1 order by id", [id])).rows };
}
export function parseShipping(raw: unknown): Shipping {
  const r = (raw ?? {}) as Record<string, any>;
  const flatRate = int(r.flatRate, "flatRate"); const freeOver = r.freeOver === null || r.freeOver === undefined || r.freeOver === "" ? null : int(r.freeOver, "freeOver");
  const pins = Array.isArray(r.pinPrefixes) ? r.pinPrefixes : []; if (!pins.length || !pins.every((p: string) => /^\d{1,6}$/.test(p))) err("pinPrefixes", "Enter at least one PIN prefix (digits only)");
  return { flatRate, freeOver, pinPrefixes: pins };
}
export const saveShipping = (db: Db, s: Shipping) => db.query("insert into settings (key, value) values ('shipping', $1::jsonb) on conflict (key) do update set value = excluded.value", [JSON.stringify(s)]);
