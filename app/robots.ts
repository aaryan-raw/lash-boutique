import type { MetadataRoute } from "next";
import { indexingAllowed, siteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/order"] }, sitemap: `${siteUrl()}/sitemap.xml` };
}
