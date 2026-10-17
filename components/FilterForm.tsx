import Link from "next/link";
import { categories, type Query } from "@/lib/catalogue";
type Props = { q: Query; basePath: string; facets: { sizes: string[]; colours: string[] }; showCategory: boolean; id: string };
function Fields({ q, facets, showCategory, id }: Omit<Props, "basePath">) {
  const chk = (name: string, v: string, on: boolean, label: string) => <label key={v} className="flex min-h-[32px] items-center gap-2 text-sm"><input type="checkbox" name={name} value={v} defaultChecked={on} className="h-4 w-4 accent-burgundy" />{label}</label>;
  return (
    <div className="space-y-5">
      <div><label htmlFor={`${id}-q`} className="field-label">Search</label><input id={`${id}-q`} name="q" type="search" defaultValue={q.q} className="field" placeholder="Name, colour, fabric" /></div>
      <div><label htmlFor={`${id}-sort`} className="field-label">Sort by</label><select id={`${id}-sort`} name="sort" defaultValue={q.sort} className="field"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
      {showCategory && <fieldset><legend className="field-label">Category</legend>{categories.map((c) => chk("category", c.slug, q.category.includes(c.slug), c.name))}</fieldset>}
      <fieldset><legend className="field-label">Size</legend>{facets.sizes.map((s) => chk("size", s, q.size.includes(s), s))}</fieldset>
      <fieldset><legend className="field-label">Colour</legend>{facets.colours.map((s) => chk("colour", s, q.colour.includes(s), s))}</fieldset>
      <fieldset><legend className="field-label">Price (INR)</legend><div className="flex gap-2">
        <input name="min" type="number" min={0} inputMode="numeric" aria-label="Minimum price" placeholder="Min" defaultValue={q.min} className="field" />
        <input name="max" type="number" min={0} inputMode="numeric" aria-label="Maximum price" placeholder="Max" defaultValue={q.max} className="field" /></div></fieldset>
      <label className="flex min-h-[32px] items-center gap-2 text-sm"><input type="checkbox" name="inStock" value="1" defaultChecked={q.inStock} className="h-4 w-4 accent-burgundy" />In stock only</label>
    </div>
  );
}
export default function FilterForm({ q, basePath, facets, showCategory }: Omit<Props, "id">) {
  const form = (id: string) => (
    <form method="get" action={basePath} aria-label="Filter and sort products">
      <Fields q={q} facets={facets} showCategory={showCategory} id={id} />
      <div className="mt-5 flex gap-3"><button type="submit" className="btn-primary flex-1">Apply</button><Link href={basePath} className="btn-secondary">Clear</Link></div>
    </form>
  );
  return (
    <>
      <details className="border border-line lg:hidden"><summary className="min-h-[44px] cursor-pointer px-4 py-3 font-medium">Filters &amp; sort</summary><div className="border-t border-line p-4">{form("m")}</div></details>
      <div className="hidden lg:block">{form("d")}</div>
    </>
  );
}
