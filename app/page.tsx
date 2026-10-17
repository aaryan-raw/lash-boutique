import Link from "next/link";
import { categories, featuredIn } from "@/lib/catalogue";
import { listActive, usingDatabase } from "@/lib/products-repo";
import { showDraftNotices, site } from "@/lib/site";
import JsonLd from "@/components/JsonLd";
import { localBusinessLd, pageMeta } from "@/lib/seo";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import ProductCard from "@/components/ProductCard";
import ContactActions from "@/components/ContactActions";
import { Grid, Notice, Section } from "@/components/Section";
export const metadata = pageMeta("Lash Boutique | Women's kurtis, cord sets & sarees in Kannammoola, Thiruvananthapuram", "Women's fashion boutique in Kannammoola, Thiruvananthapuram: kurtis, cord sets, sarees and more. Visit the store or shop online.", "/");
export const dynamic = "force-dynamic";
export default async function Home() {
  const all = await listActive();
  return (
    <>
      <JsonLd data={localBusinessLd()} />
      <section className="bg-cream">
        <div className="container-page grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div>
            <p className="eyebrow mb-3">Kannammoola, Thiruvananthapuram</p>
            <h1 className="text-5xl leading-[1.05] md:text-6xl">Considered fashion, made easy to wear.</h1>
            <div className="rule-gold my-5" />
            <p className="max-w-md text-muted">Kurtis, cord sets and sarees chosen for fabric, stitching and value.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/shop" className="btn-primary">Shop Collection</Link><Link href="/collections/new-arrivals" className="btn-secondary">New Arrivals</Link></div>
          </div>
          <ImagePlaceholder label="Hero photography placeholder" ratio="aspect-[4/5] md:aspect-[5/6]" />
        </div>
      </section>
      <Section eyebrow="Browse" title="Shop by category">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">{categories.map((c) => (
          <li key={c.slug}><Link href={`/category/${c.slug}`} className="group block"><ImagePlaceholder label="Category image" ratio="aspect-[4/3]" /><h3 className="mt-3 text-2xl group-hover:text-burgundy">{c.name}</h3><p className="text-sm text-muted">{c.blurb}</p></Link></li>))}</ul>
      </Section>
      <Section eyebrow="Just in" title="New arrivals" href="/collections/new-arrivals" tone="cream">
        {!usingDatabase() && <div className="mb-6"><Notice>Sample products shown for layout. Real inventory to follow.</Notice></div>}
        <Grid>{featuredIn(all, "newArrival").map((p) => <ProductCard key={p.slug} p={p} />)}</Grid>
      </Section>
      <Section eyebrow="Loved" title="Bestsellers" href="/collections/bestsellers">
        <Grid>{featuredIn(all, "bestseller").map((p) => <ProductCard key={p.slug} p={p} />)}</Grid>
      </Section>
      <Section title="Fashion, quality, affordability" tone="cream">
        <div className="grid gap-6 md:grid-cols-3">{["Variety across kurtis, cord sets and sarees", "Attention to fabric and stitching", "Fair prices for everyday and occasion wear"].map((t) => <p key={t} className="border-t border-gold pt-4">{t}</p>)}</div>
        {showDraftNotices() && <p className="mt-6 max-w-2xl text-sm text-muted">Brand story copy is a draft based on themes in the owner&apos;s brief, to be rewritten with the owner.</p>}
      </Section>
      <Section eyebrow="Reviews" title="What customers say">
        <p className="font-serif text-5xl">{site.rating.value}<span className="text-2xl text-muted"> / 5</span></p>
        <p className="mt-1 text-sm">from {site.rating.count} Google reviews</p>
        {showDraftNotices() && <div className="mt-4 max-w-xl"><Notice>{site.rating.note}. Verified review quotes will be added only with the owner&apos;s permission.</Notice></div>}
      </Section>
      <Section eyebrow="Visit" title="Come to the boutique" tone="cream">
        <address className="mb-6 not-italic text-muted">{site.address.map((l) => <span key={l} className="block">{l}</span>)}</address>
        <ContactActions />
      </Section>
    </>
  );
}
