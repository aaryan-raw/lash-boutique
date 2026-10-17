import { adminGuard, fail, json, needDb } from "@/lib/http";
import { parseProduct, upsertProduct } from "@/lib/admin-service";
import type { Db } from "@/lib/db";
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const g = adminGuard(req); if (g instanceof Response) return g; const db = needDb(); if (db instanceof Response) return db;
  try { return json(200, { id: await upsertProduct(db as Db, parseProduct(await req.json().catch(() => null)), params.id) }); } catch (e) { return fail(e); }
}
