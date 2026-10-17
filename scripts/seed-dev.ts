// Loads the labelled SAMPLE products into a DEVELOPMENT database. Refuses to run in production or without explicit confirmation.
import { Pool } from "pg";
import { SCHEMA } from "../lib/schema";
import { devProducts } from "../lib/dev-products";
import { parseProduct, upsertProduct } from "../lib/admin-service";
(async () => {
  if (process.env.NODE_ENV === "production" || !process.argv.includes("--yes-this-is-a-dev-database")) { console.error("Refusing: sample data must never be loaded into production. Re-run with --yes-this-is-a-dev-database on a development DB."); process.exit(1); }
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL }); await pool.query(SCHEMA);
  const db = { query: async (s: string, p?: unknown[]) => { const r = await pool.query(s, p as unknown[]); return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length }; },
    tx: async <T,>(fn: (q: never) => Promise<T>) => { const c = await pool.connect(); try { await c.query("BEGIN"); const out = await fn({ query: async (s: string, p?: unknown[]) => { const r = await c.query(s, p as unknown[]); return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length }; } } as never); await c.query("COMMIT"); return out; } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); } } };
  for (const p of devProducts) { const { id, createdAt, devData, ...input } = p; void id; void createdAt; void devData; try { await upsertProduct(db as never, parseProduct(input)); } catch (e) { console.error("skipped", p.slug, (e as Error).message); } }
  await pool.end(); console.log(`Seeded ${devProducts.length} sample products (development only).`);
})();
