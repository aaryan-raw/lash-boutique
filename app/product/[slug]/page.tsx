import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Gallery from "@/components/Gallery";
import Price from "@/components/Price";
import ProductCard from "@/components/ProductCard";
import ProductPurchase from "@/components/ProductPurchase";
import RecentlyViewed from "@/components/RecentlyViewed";
import { Grid, Notice } from "@/components/Section";
import { categoryName, related } from "@/lib/catalogue";
import { getBySlug, listActive } from "@/lib/products-repo";
import { whatsappFor } from "@/lib/site";
import JsonLd from "@/components/JsonLd";
import { pageMeta, siteUrl } from "@/lib/seo";
import { effectivePrice, inStock } from "@/lib/catalogue";
export const dynamic = "force-dynamic";
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) { const params = await props.params; const p = await getBySlug(params.slug); if (!p) return { title: "Product not found", robots: { index: false } }; return { ...pageMeta(p.name, `${p.description || p.name} Available at Lash Boutique, Kannammoola, Thiruvananthapuram.`.slice(0, 300), `/product/${p.slug}`), ...(p.devData ? { robots: { index: false, follow: false } } : {}) }; }
export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const p = await getBySlug(params.slug);
  if (!p) notFound();
  const rel = related(await listActive(), p);
  const url = `/product/${p.slug}`;
  const attrs = [["Fabric", p.attributes.fabric], ["Fit", p.attributes.fit], ["Care", p.attributes.care]].filter((a) => a[1]);
  // Product structured data only for real (non-sample) products, using database price and stock.
  const ld = p.devData ? null : { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, sku: p.variants[0]?.sku, brand: { "@type": "Brand", name: "Lash Boutique" }, ...(p.images.some((i) => i.url) ? { image: p.images.filter((i) => i.url).map((i) => i.url) } : {}),
    offers: { "@type": "Offer", priceCurrency: "INR", price: effectivePrice(p), availability: inStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", ...(siteUrl() ? { url: `${siteUrl()}/product/${p.slug}` } : {}) } };
  return (
    <>
      {ld && <JsonLd data={ld} />}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: categoryName(p.category), href: `/category/${p.category}` }, { label: p.name }]} />
      <div className="container-page grid gap-8 py-8 md:grid-cols-2 md:gap-12">
        <Gallery images={p.images} />
        <div>
          <h1 className="text-4xl md:text-5xl">{p.name}</h1>
          <div className="mb-4 mt-2"><Price p={p} large /></div>
          {p.devData && <div className="mb-5"><Notice>Development sample: price, stock and details are placeholders.</Notice></div>}
          <ProductPurchase product={p} waHref={whatsappFor(p.name, url)} />
          <div className="mt-8 border-t border-line pt-5"><h2 className="mb-2 text-2xl">Details</h2><p className="text-muted">{p.description}</p>
            <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">{attrs.map(([k, v]) => <div key={k as string} className="contents"><dt className="font-medium">{k}</dt><dd>{v}</dd></div>)}</dl>
            <details className="mt-4 border border-line p-3"><summary className="cursor-pointer font-medium">Size guide</summary><p className="mt-2 text-sm text-muted">Placeholder: measurements will be added once supplied by the boutique.</p></details></div>
        </div>
      </div>
      {rel.length > 0 && <section className="container-page py-10"><h2 className="mb-6 text-3xl">You may also like</h2><Grid>{rel.map((r) => <ProductCard key={r.id} p={r} />)}</Grid></section>}
      <RecentlyViewed current={{ slug: p.slug, name: p.name }} />
    </>
  );
}
