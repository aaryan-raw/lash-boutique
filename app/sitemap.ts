import type { MetadataRoute } from "next";
import { categories, collections } from "@/lib/catalogue";
import { listActive } from "@/lib/products-repo";
import { indexingAllowed, siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl(); if (!base || !indexingAllowed()) return [];
  const statics = ["", "/shop", "/about", "/contact", "/shipping", "/returns", "/privacy", "/terms"];
  const products = (await listActive()).filter((p) => !p.devData); // sample products are never submitted to search engines
  return [...statics.map((p) => ({ url: base + p })), ...categories.map((c) => ({ url: `${base}/category/${c.slug}` })), ...Object.keys(collections).map((s) => ({ url: `${base}/collections/${s}` })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: new Date(p.createdAt) }))];
}
