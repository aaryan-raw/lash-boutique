// DEVELOPMENT DATASET ONLY. Not real products, prices or stock.
// Replace this module's export (or the functions in lib/catalogue.ts) with the real
// catalogue source (database/admin) without touching UI components.
import type { Product } from "./types";
type Flags = { f?: 1; n?: 1; b?: 1 };
const SIZES = ["S", "M", "L", "XL"];
function mk(code: string, category: string, label: string, colour: string, price: number, sale: number | undefined, stock: number[] | number, fl: Flags, day: number): Product {
  const free = typeof stock === "number";
  const variants = free ? [{ sku: `DEV-${code}-FS`, size: "Free size", colour, stock }] : SIZES.slice(0, stock.length).map((s, i) => ({ sku: `DEV-${code}-${s}`, size: s, colour, stock: stock[i] }));
  const name = `Sample ${label} (${colour})`;
  return {
    id: `dev-${code.toLowerCase()}`, slug: `sample-${label.toLowerCase().replace(/ /g, "-")}-${colour.toLowerCase()}`, name,
    description: "Development sample record. Real description will come from the owner's catalogue.",
    category, collections: [...(fl.n ? ["new-arrivals"] : []), ...(fl.b ? ["bestsellers"] : [])],
    price, salePrice: sale, variants,
    images: ["front view", "back view", "fabric detail"].map((v, i) => ({ id: `${code}-${i}`, alt: `Placeholder image: ${name}, ${v}` })),
    attributes: { fabric: "Sample fabric (to be confirmed)", fit: "Sample fit (to be confirmed)", care: "Care instructions to be confirmed" },
    featured: !!fl.f, newArrival: !!fl.n, bestseller: !!fl.b, status: "active", createdAt: `2026-09-${String(day).padStart(2, "0")}`, devData: true,
  };
}
export const devProducts: Product[] = [
  mk("K1", "kurtis", "Kurti", "Sage", 1000, undefined, [2, 5, 3, 0], { f: 1, n: 1 }, 20),
  mk("K2", "kurtis", "Kurti", "Burgundy", 1200, 999, [0, 0, 0, 0], { b: 1 }, 5),
  mk("K3", "kurtis", "Kurti", "Ivory", 1100, undefined, [4, 4, 4, 2], { f: 1, b: 1 }, 12),
  mk("K4", "kurtis", "Kurti", "Champagne", 900, undefined, [1, 3, 2], { n: 1 }, 25),
  mk("C1", "cord-sets", "Cord Set", "Sage", 2000, undefined, [3, 3, 2], { f: 1, b: 1 }, 18),
  mk("C2", "cord-sets", "Cord Set", "Burgundy", 2200, 1800, [2, 0, 4], { n: 1 }, 22),
  mk("C3", "cord-sets", "Cord Set", "Ivory", 2100, undefined, [5, 5, 5, 5], {}, 3),
  mk("C4", "cord-sets", "Cord Set", "Champagne", 2400, undefined, [0, 0, 1], { b: 1 }, 9),
  mk("S1", "sarees", "Saree", "Burgundy", 3000, undefined, 5, { f: 1 }, 15),
  mk("S2", "sarees", "Saree", "Sage", 3500, 3000, 2, { b: 1, n: 1 }, 27),
  mk("S3", "sarees", "Saree", "Ivory", 2800, undefined, 0, {}, 1),
  mk("S4", "sarees", "Saree", "Champagne", 3200, undefined, 1, { n: 1 }, 28),
  { ...mk("X1", "kurtis", "Kurti", "Inactive", 1000, undefined, [1], {}, 2), status: "inactive" },
];
