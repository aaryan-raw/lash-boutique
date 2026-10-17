import { adminGuard, fail, json, needDb } from "@/lib/http";
import { changeStatus, OrderError, TRANSITIONS, type Status } from "@/lib/orders";
import type { Db } from "@/lib/db";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const g = adminGuard(req); if (g instanceof Response) return g; const db = needDb(); if (db instanceof Response) return db;
  try {
    const b = (await req.json().catch(() => null)) as { status?: string; note?: unknown } | null;
    if (!b?.status || !(b.status in TRANSITIONS)) throw new OrderError(422, "invalid_status");
    return json(200, await changeStatus(db as Db, params.id, b.status as Status, g.email, typeof b.note === "string" ? b.note : ""));
  } catch (e) { return fail(e); }
}
