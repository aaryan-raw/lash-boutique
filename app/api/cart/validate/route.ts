import { NextResponse } from "next/server";
import { validateCart } from "@/lib/pricing";
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  return NextResponse.json(await validateCart(items), { headers: { "Cache-Control": "no-store" } });
}
