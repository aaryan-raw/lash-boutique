import { describe, expect, it } from "vitest";
import { parseQuery, queryProducts } from "@/lib/catalogue";
import { devProducts } from "@/lib/dev-products";
import { validateCart } from "@/lib/pricing";
const run = (sp: Record<string, string | string[]> = {}, scope = {}) => queryProducts(devProducts.filter((p) => p.status === "active"), scope, parseQuery(sp));
const names = (r: ReturnType<typeof run>) => r.items.map((p) => p.name);
describe("search/filter/sort", () => {
  it("inactive products never appear", () => expect(run({ q: "inactive" }).total).toBe(0));
  it("search by name, colour and attribute", () => { expect(run({ q: "saree" }).total).toBe(4); expect(run({ q: "burgundy" }).total).toBe(3); expect(run({ q: "sample fabric" }).total).toBe(12); });
  it("category filter", () => expect(run({ category: "kurtis" }, {}).items.every((p) => p.category === "kurtis")).toBe(true));
  it("size + in-stock filter excludes sold-out sizes", () => { const r = run({ size: "XL", inStock: "1", category: "kurtis" }); expect(names(r)).toEqual(["Sample Kurti (Ivory)"]); });
  it("colour filter", () => expect(run({ colour: "Sage" }).items.every((p) => p.variants[0].colour === "Sage")).toBe(true));
  it("price range uses sale price", () => { const r = run({ min: "1500", max: "2000" }); expect(names(r)).toContain("Sample Cord Set (Burgundy)"); expect(names(r)).toContain("Sample Cord Set (Sage)"); });
  it("combined filters can yield empty results", () => expect(run({ q: "saree", colour: "Sage", max: "100" }).total).toBe(0));
  it("sorts by price asc/desc and newest", () => {
    const a = run({ sort: "price-asc" }).items.map((p) => p.salePrice ?? p.price); expect(a).toEqual([...a].sort((x, y) => x - y));
    const d = run({ sort: "price-desc" }).items.map((p) => p.salePrice ?? p.price); expect(d).toEqual([...d].sort((x, y) => y - x));
    const n = run({ sort: "newest" }).items.map((p) => p.createdAt); expect(n).toEqual([...n].sort().reverse());
  });
  it("paginates 8 per page and clamps page", () => { expect(run().items.length).toBe(8); expect(run({ page: "2" }).items.length).toBe(4); expect(run({ page: "99" }).page).toBe(2); });
  it("collection scope", () => expect(run({}, { collection: "new-arrivals" }).items.every((p) => p.newArrival)).toBe(true));
});
describe("server-side cart validation", () => {
  it("ignores any client price and uses catalogue price", async () => { const r = await validateCart([{ sku: "DEV-S2-FS", qty: 1, price: 1 }]); expect(r.lines[0].unitPrice).toBe(3000); expect(r.subtotal).toBe(3000); });
  it("clamps to stock", async () => { const r = await validateCart([{ sku: "DEV-S4-FS", qty: 5 }]); expect(r.lines[0]).toMatchObject({ qty: 1, status: "reduced" }); });
  it("flags out of stock and unknown SKUs, excludes from subtotal", async () => { const r = await validateCart([{ sku: "DEV-S3-FS", qty: 1 }, { sku: "NOPE", qty: 1 }]); expect(r.lines.map((l) => l.status)).toEqual(["out_of_stock", "unavailable"]); expect(r.subtotal).toBe(0); });
  it("inactive SKU unavailable; bad input ignored; duplicates merge", async () => { expect((await validateCart([{ sku: "DEV-X1-S", qty: 1 }])).lines[0].status).toBe("unavailable"); expect((await validateCart("x")).lines).toEqual([]); expect((await validateCart([{ sku: "DEV-K3-M", qty: -1 }, { sku: "DEV-K3-M", qty: 1.5 }])).lines).toEqual([]); expect((await validateCart([{ sku: "DEV-K3-M", qty: 1 }, { sku: "DEV-K3-M", qty: 2 }])).lines[0].qty).toBe(3); });
  it("caps quantity per line", async () => expect((await validateCart([{ sku: "DEV-C3-S", qty: 50 }])).lines[0].qty).toBe(5));
});
import { readFileSync } from "node:fs";
import { SCHEMA } from "@/lib/schema";
describe("handover artefacts", () => { it("db/schema.sql matches lib/schema.ts", () => expect(readFileSync("db/schema.sql", "utf8")).toContain(SCHEMA.trim())); });
