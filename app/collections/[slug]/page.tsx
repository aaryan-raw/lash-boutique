import { notFound } from "next/navigation";
import Catalogue from "@/components/Catalogue";
import { collections } from "@/lib/catalogue";
import { pageMeta } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) { const params = await props.params; const c = collections[params.slug]; return c ? pageMeta(c.name, `${c.blurb} From Lash Boutique, Kannammoola, Thiruvananthapuram.`, `/collections/${params.slug}`) : {}; }
export default async function Page(props: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await props.params; const searchParams = await props.searchParams;
  const c = collections[params.slug];
  if (!c) notFound();
  return <Catalogue title={c.name} blurb={c.blurb} basePath={`/collections/${params.slug}`} scope={{ collection: params.slug }} searchParams={searchParams} crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: c.name }]} />;
}
