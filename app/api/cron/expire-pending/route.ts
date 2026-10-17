import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { expirePending } from "@/lib/orders";
export async function POST(req: Request) {
  try {
    const s = process.env.CRON_SECRET, db = getDb(); if (!s || !db) return json(503, { error: "not_configured" });
    const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
    if (got.length !== s.length || !timingSafeEqual(Buffer.from(got), Buffer.from(s))) return json(401, { error: "unauthorized" });
    return json(200, { cancelled: await expirePending(db, 30) });
  } catch (e) { return fail(e); }
}
