// Product source: Postgres when DATABASE_URL is configured, otherwise the clearly-marked development dataset.
import { getDb, type Db } from "./db";
import { devProducts } from "./dev-products";
import type { Product, Variant } from "./types";
type PRow = { id: string; slug: string; name: string; description: string; category: string; collections: string[]; price: number; sale_price: number | null; images: Product["images"]; attributes: Product["attributes"]; featured: boolean; new_arrival: boolean; bestseller: boolean; status: "active" | "inactive"; created_at: string | Date };
type VRow = { sku: string; product_id: string; size: string; colour: string; stock: number };
export function mapProduct(r: PRow, vs: VRow[]): Product {
  return { id: r.id, slug: r.slug, name: r.name, description: r.description, category: r.category, collections: r.collections, price: r.price, salePrice: r.sale_price ?? undefined,
    images: r.images, attributes: r.attributes, featured: r.featured, newArrival: r.new_arrival, bestseller: r.bestseller, status: r.status, createdAt: new Date(r.created_at).toISOString(),
    variants: vs.filter((v) => v.product_id === r.id).map(({ sku, size, colour, stock }) => ({ sku, size, colour, stock })) };
}
export async function loadProducts(db: Db, activeOnly: boolean): Promise<Product[]> {
  const where = activeOnly ? "where status = 'active'" : "";
  const ps = (await db.query<PRow>(`select * from products ${where} order by created_at desc`)).rows;
  const vs = (await db.query<VRow>(`select * from variants ${activeOnly ? "where product_id in (select id from products where status = 'active')" : ""} order by sku`)).rows;
  return ps.map((p) => mapProduct(p, vs));
}
export const usingDatabase = () => getDb() !== null;
export async function listActive(): Promise<Product[]> { const db = getDb(); return db ? loadProducts(db, true) : devProducts.filter((p) => p.status === "active"); }
export async function getBySlug(slug: string) { return (await listActive()).find((p) => p.slug === slug); }
export async function findVariants(skus: string[]): Promise<Map<string, { product: Product; variant: Variant }>> {
  const out = new Map<string, { product: Product; variant: Variant }>();
  for (const product of await listActive()) for (const variant of product.variants) if (skus.includes(variant.sku)) out.set(variant.sku, { product, variant });
  return out;
}
