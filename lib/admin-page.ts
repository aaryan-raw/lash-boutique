import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminFromCookieHeader } from "./auth";
import { getDb } from "./db";
/** Server-side gate. Every admin page calls this itself, so access never depends on a layout or a hidden link. */
export async function requireAdminPage() {
  const who = adminFromCookieHeader((await headers()).get("cookie"));
  if (!who) redirect("/admin/login");
  return who;
}
export const adminDb = () => getDb();
