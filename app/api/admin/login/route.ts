import { cookieFlags, COOKIE, login } from "@/lib/auth";
import { json } from "@/lib/http";
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== "string" || typeof body?.password !== "string") return json(400, { error: "invalid_request" });
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json(403, { error: "bad_origin" });
  const r = login(body.email, body.password, req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local");
  if (!r.ok) return json(r.status, { error: r.status === 503 ? "admin_not_configured" : r.status === 429 ? "too_many_attempts" : "invalid_credentials" });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": `${COOKIE}=${r.token}; ${cookieFlags()}` } });
}
