import { adminGuard, fail, json, needDb } from "@/lib/http";
import { parseShipping, saveShipping } from "@/lib/admin-service";
import { getShipping } from "@/lib/orders";
import type { Db } from "@/lib/db";
export async function GET(req: Request) { const g = adminGuard(req); if (g instanceof Response) return g; const db = needDb(); if (db instanceof Response) return db; try { return json(200, await getShipping(db as Db)); } catch (e) { return fail(e); } }
export async function PUT(req: Request) { const g = adminGuard(req); if (g instanceof Response) return g; const db = needDb(); if (db instanceof Response) return db; try { await saveShipping(db as Db, parseShipping(await req.json().catch(() => null))); return json(200, { ok: true }); } catch (e) { return fail(e); } }
