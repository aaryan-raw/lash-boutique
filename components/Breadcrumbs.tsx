import Link from "next/link";
export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="container-page pt-6 text-sm text-muted">
      <ol className="flex flex-wrap gap-x-2">{items.map((c, i) => (
        <li key={c.label} className="flex gap-2">{c.href ? <Link href={c.href} className="underline-offset-4 hover:underline">{c.label}</Link> : <span aria-current="page" className="text-ink">{c.label}</span>}{i < items.length - 1 && <span aria-hidden="true">/</span>}</li>
      ))}</ol>
    </nav>
  );
}
