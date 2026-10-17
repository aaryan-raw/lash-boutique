import type { Metadata } from "next";
import { site } from "./site";
/** Public site URL, e.g. https://www.example.com (no trailing slash). Canonicals, sitemap and structured-data URLs need it. */
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;
/** Search engines are told to index only when the owner explicitly sets ALLOW_INDEXING=true AND a site URL exists. */
export const indexingAllowed = () => process.env.ALLOW_INDEXING === "true" && !!siteUrl();
export const robotsMeta = () => (indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false });
export function pageMeta(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: siteUrl() ? { canonical: path } : undefined, openGraph: { title, description, url: siteUrl() ? path : undefined, siteName: site.name, locale: "en_IN", type: "website" } };
}
export const noIndex: Metadata = { robots: { index: false, follow: false } };
/** Safe JSON-LD serialisation (prevents </script> injection from admin-entered text). */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
/** Only verified facts: name, address, phone. No rating, hours or geo until the owner confirms them. */
export function localBusinessLd() {
  return { "@context": "https://schema.org", "@type": "ClothingStore", name: site.name, telephone: site.phoneTel, ...(siteUrl() ? { url: siteUrl() } : {}),
    address: { "@type": "PostalAddress", streetAddress: "Opposite CSI Church Auditorium, Kannammoola", addressLocality: "Thiruvananthapuram", addressRegion: "Kerala", postalCode: "695011", addressCountry: "IN" } };
}
