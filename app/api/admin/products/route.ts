import { adminGuard, fail, json, needDb } from "@/lib/http";
import { listProductsAdmin, parseProduct, upsertProduct } from "@/lib/admin-service";
import type { Db } from "@/lib/db";
export async function GET(req: Request) { const g = adminGuard(req); if (g instanceof Response) return g; const db = needDb(); if (db instanceof Response) return db; try { return json(200, await listProductsAdmin(db as Db)); } catch (e) { return fail(e); } }
export async function POST(req: Request) {
  const g = adminGuard(req); if (g instanceof Response) return g; const db = needDb(); if (db instanceof Response) return db;
  try { return json(201, { id: await upsertProduct(db as Db, parseProduct(await req.json().catch(() => null))) }); } catch (e) { return fail(e); }
}
