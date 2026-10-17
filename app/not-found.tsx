import Link from "next/link";
import { categories } from "@/lib/catalogue";
export const metadata = { title: "Page not found", robots: { index: false, follow: false } };
export default function NotFound() {
  return (<div className="container-page py-20 text-center"><h1 className="text-4xl">Page not found</h1><p className="mt-3 text-muted">The page you are looking for does not exist or has moved.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/shop" className="btn-primary">Shop all</Link>{categories.map((c) => <Link key={c.slug} href={`/category/${c.slug}`} className="btn-secondary">{c.name}</Link>)}</div></div>);
}
