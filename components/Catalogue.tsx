import Link from "next/link";
import { listActive, usingDatabase } from "@/lib/products-repo";
import { buildHref, parseQuery, queryProducts, type Scope } from "@/lib/catalogue";
import Breadcrumbs from "./Breadcrumbs";
import FilterForm from "./FilterForm";
import ProductCard from "./ProductCard";
import { Grid, Notice } from "./Section";
type Props = { title: string; blurb: string; basePath: string; scope: Scope; searchParams: Record<string, string | string[] | undefined>; crumbs: { label: string; href?: string }[] };
export default async function Catalogue({ title, blurb, basePath, scope, searchParams, crumbs }: Props) {
  const q = parseQuery(searchParams);
  const r = queryProducts(await listActive(), scope, q);
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className="container-page py-8">
        <h1 className="text-4xl md:text-5xl">{title}</h1>
        <p className="mt-2 max-w-xl text-muted">{blurb}</p>
        {!usingDatabase() && <div className="my-6"><Notice>Development data: products, prices and stock shown here are samples, not real boutique inventory.</Notice></div>}
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside><FilterForm q={q} basePath={basePath} facets={r.facets} showCategory={!scope.category && !scope.collection ? true : !scope.category} /></aside>
          <div>
            <p className="mb-4 text-sm text-muted" role="status">{r.total} {r.total === 1 ? "product" : "products"}{q.q && <> for &ldquo;{q.q}&rdquo;</>}</p>
            <h2 className="sr-only">Products</h2>
            {r.items.length ? <Grid>{r.items.map((p) => <ProductCard key={p.id} p={p} />)}</Grid> : (
              <div className="border border-line bg-cream p-8 text-center"><p className="font-serif text-2xl">No products match</p><p className="mt-2 text-sm text-muted">Try removing a filter or searching a different word.</p><Link href={basePath} className="btn-primary mt-4">Clear all filters</Link></div>)}
            {r.pages > 1 && <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4 text-sm">
              {r.page > 1 ? <Link href={buildHref(basePath, q, r.page - 1)} className="btn-secondary" rel="prev">Previous</Link> : <span className="btn-secondary opacity-50" aria-disabled="true">Previous</span>}
              <span aria-current="page">Page {r.page} of {r.pages}</span>
              {r.page < r.pages ? <Link href={buildHref(basePath, q, r.page + 1)} className="btn-secondary" rel="next">Next</Link> : <span className="btn-secondary opacity-50" aria-disabled="true">Next</span>}
            </nav>}
          </div>
        </div>
      </div>
    </>
  );
}
