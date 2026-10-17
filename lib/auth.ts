import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
// Single-owner admin login. Requires ADMIN_EMAIL, ADMIN_PASSWORD_HASH (see scripts/hash-password.ts) and SESSION_SECRET (>= 32 chars).
export const COOKIE = "lb_admin";
const TTL_MS = 8 * 3600 * 1000;
const secret = () => { const s = process.env.SESSION_SECRET; return s && s.length >= 32 ? s : null; };
export const adminConfigured = () => !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && secret());
export function hashPassword(pw: string) { const salt = randomBytes(16).toString("hex"); return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`; }
function checkPassword(pw: string, stored: string) {
  const [alg, salt, hash] = stored.split("$"); if (alg !== "scrypt" || !salt || !hash) return false;
  const a = scryptSync(pw, salt, 64), b = Buffer.from(hash, "hex"); return a.length === b.length && timingSafeEqual(a, b);
}
const sign = (p: string, s: string) => createHmac("sha256", s).update(p).digest("base64url");
export function createSession(email: string, now = Date.now()) { const s = secret(); if (!s) throw new Error("SESSION_SECRET not configured"); const p = Buffer.from(JSON.stringify({ sub: email, exp: now + TTL_MS })).toString("base64url"); return `${p}.${sign(p, s)}`; }
export function verifySession(token: string | undefined, now = Date.now()): { email: string } | null {
  const s = secret(); if (!s || !token) return null;
  const [p, sig] = token.split("."); if (!p || !sig) return null;
  const good = sign(p, s); if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  try { const d = JSON.parse(Buffer.from(p, "base64url").toString()); return typeof d.exp === "number" && d.exp > now && d.sub === process.env.ADMIN_EMAIL ? { email: d.sub } : null; } catch { return null; }
}
export const adminFromCookieHeader = (h: string | null | undefined) => verifySession(h?.split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1));
const attempts = new Map<string, { n: number; reset: number }>(); // per-instance limiter
export function login(email: string, pw: string, ip: string, now = Date.now()): { ok: true; token: string } | { ok: false; status: number } {
  if (!adminConfigured()) return { ok: false, status: 503 };
  const a = attempts.get(ip); if (a && a.reset > now && a.n >= 5) return { ok: false, status: 429 };
  const okEmail = email.length === process.env.ADMIN_EMAIL!.length && timingSafeEqual(Buffer.from(email), Buffer.from(process.env.ADMIN_EMAIL!));
  const okPw = checkPassword(pw, process.env.ADMIN_PASSWORD_HASH!);
  if (!(okEmail && okPw)) { attempts.set(ip, { n: (a && a.reset > now ? a.n : 0) + 1, reset: a && a.reset > now ? a.reset : now + 15 * 60 * 1000 }); return { ok: false, status: 401 }; }
  attempts.delete(ip); return { ok: true, token: createSession(email, now) };
}
export const cookieFlags = (maxAge = TTL_MS / 1000) => `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
