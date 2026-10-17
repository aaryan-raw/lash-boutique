import { Pool } from "pg";
export type Row = Record<string, unknown>;
export interface Q { query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> }
export interface Db extends Q { tx<T>(fn: (q: Q) => Promise<T>): Promise<T> }
let override: Db | null | undefined;
export const setDb = (d: Db | null | undefined) => { override = d; }; // tests only
let pooled: Db | undefined;
/** Returns the Postgres connection, or null when DATABASE_URL is not configured. Use ?sslmode=require in the URL for hosted databases. */
export function getDb(): Db | null {
  if (override !== undefined) return override;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pooled) {
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX) || (process.env.NETLIFY ? 1 : 5) });
    pooled = {
      query: async (sql, params) => { const r = await pool.query(sql, params as unknown[]); return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length }; },
      tx: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const out = await fn({ query: async (sql, params) => { const r = await c.query(sql, params as unknown[]); return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length }; } });
          await c.query("COMMIT"); return out;
        } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
      },
    };
  }
  return pooled;
}
