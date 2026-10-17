import { notFound } from "next/navigation";
import Catalogue from "@/components/Catalogue";
import { categories } from "@/lib/catalogue";
import { pageMeta } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) { const params = await props.params; const c = categories.find((x) => x.slug === params.slug); return c ? pageMeta(`${c.name} for women`, `${c.blurb} Shop ${c.name.toLowerCase()} from Lash Boutique, Kannammoola, Thiruvananthapuram.`, `/category/${c.slug}`) : {}; }
export default async function Page(props: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.params; const searchParams = await props.searchParams;
  const c = categories.find((x) => x.slug === params.slug);
  if (!c) notFound();
  return <Catalogue title={c.name} blurb={c.blurb} basePath={`/category/${c.slug}`} scope={{ category: c.slug }} searchParams={searchParams} crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: c.name }]} />;
}
