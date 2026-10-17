import { pageMeta } from "@/lib/seo";
import Catalogue from "@/components/Catalogue";
export const metadata = pageMeta("Shop all women's clothing", "Browse kurtis, cord sets and sarees from Lash Boutique, Kannammoola, Thiruvananthapuram.", "/shop");
export const dynamic = "force-dynamic";
export default async function Shop(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  return <Catalogue title="Shop All" blurb="Browse the full boutique collection." basePath="/shop" scope={{}} searchParams={searchParams} crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]} />;
}
