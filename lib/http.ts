import { adminFromCookieHeader } from "./auth";
import { getDb, type Db } from "./db";
import { OrderError } from "./orders";
export const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
/** Authorizes an admin API request: valid signed session, and same-origin + JSON for mutations (CSRF defence on top of SameSite=Strict). */
export function adminGuard(req: Request): Response | { email: string } {
  const who = adminFromCookieHeader(req.headers.get("cookie"));
  if (!who) return json(401, { error: "unauthorized" });
  if (req.method !== "GET") {
    const origin = req.headers.get("origin"), host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return json(403, { error: "bad_origin" });
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json(415, { error: "json_required" });
  }
  return who;
}
export const needDb = (): Db | Response => getDb() ?? json(503, { error: "database_not_configured" });
export function fail(e: unknown) {
  if (e instanceof OrderError) return json(e.status, { error: e.code, details: e.details });
  if ((e as { code?: string })?.code === "23505") return json(409, { error: "duplicate" });
  console.error("request failed", (e as Error)?.message); return json(500, { error: "server_error" });
}
