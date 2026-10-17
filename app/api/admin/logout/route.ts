import { cookieFlags, COOKIE } from "@/lib/auth";
export async function POST() { return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": `${COOKIE}=; ${cookieFlags(0)}` } }); }
