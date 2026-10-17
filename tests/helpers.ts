import { PGlite } from "@electric-sql/pglite";
import type { Db, Q } from "@/lib/db";
import { SCHEMA } from "@/lib/schema";
import { parseProduct, saveShipping, upsertProduct } from "@/lib/admin-service";
// Real Postgres engine (WASM) so the production SQL, constraints and transactions are genuinely exercised.
export async function makeDb(): Promise<Db> {
  const pg = new PGlite(); await pg.exec(SCHEMA);
  const wrap = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: any[]; affectedRows?: number }> }): Q => ({ query: async (sql, params) => { const r = await c.query(sql, params); return { rows: r.rows as never[], rowCount: r.affectedRows && r.affectedRows > 0 ? r.affectedRows : r.rows.length }; } });
  return { ...wrap(pg), tx: <T,>(fn: (q: Q) => Promise<T>) => pg.transaction((t) => fn(wrap(t as never))) as Promise<T> };
}
const base = { description: "d", category: "kurtis", price: 1000, images: [{ alt: "front" }], attributes: {}, status: "active" };
export async function seed(db: Db) {
  await upsertProduct(db, parseProduct({ ...base, name: "Test Kurti", slug: "test-kurti", variants: [{ sku: "T-M", size: "M", colour: "Sage", stock: 5 }] }));
  await upsertProduct(db, parseProduct({ ...base, name: "Test Saree", slug: "test-saree", category: "sarees", price: 3000, salePrice: 2500, variants: [{ sku: "S-FS", size: "Free size", colour: "Ivory", stock: 1 }] }));
  await saveShipping(db, { flatRate: 80, freeOver: 3000, pinPrefixes: ["695", "68"] });
}
export const body = (over: Record<string, unknown> = {}, key = crypto.randomUUID()) => ({
  items: [{ sku: "T-M", qty: 1 }], customer: { name: "Asha Nair", phone: "+91 99957 82624", email: "asha@example.com" },
  address: { line1: "12 Test Road", city: "Thiruvananthapuram", state: "Kerala", pincode: "695011" }, paymentMethod: "cod", consent: true, idempotencyKey: key, ...over });
export const stock = async (db: Db, sku: string) => (await db.query<{ stock: number }>("select stock from variants where sku=$1", [sku])).rows[0].stock;
