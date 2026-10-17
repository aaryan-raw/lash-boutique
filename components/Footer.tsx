import Link from "next/link";
import { nav, policyLinks, site } from "@/lib/site";
export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-ivory">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-1"><p className="font-serif text-2xl">{site.name}</p><p className="mt-2 text-sm text-ivory/70">{site.tagline}</p></div>
        <div><h2 className="mb-3 text-sm font-sans uppercase tracking-widest text-gold">Shop</h2><ul className="space-y-2 text-sm">{nav.map((n) => <li key={n.href}><Link href={n.href} className="hover:underline">{n.label}</Link></li>)}</ul></div>
        <div><h2 className="mb-3 text-sm font-sans uppercase tracking-widest text-gold">Help</h2><ul className="space-y-2 text-sm">{policyLinks.map((n) => <li key={n.href}><Link href={n.href} className="hover:underline">{n.label}</Link></li>)}<li><Link href="/about" className="hover:underline">About</Link></li></ul></div>
        <div><h2 className="mb-3 text-sm font-sans uppercase tracking-widest text-gold">Visit</h2>
          <address className="text-sm not-italic text-ivory/80">{site.address.map((l) => <span key={l} className="block">{l}</span>)}</address>
          <p className="mt-3 text-sm"><a href={`tel:${site.phoneTel}`} className="hover:underline">{site.phoneDisplay}</a></p>
          <p className="mt-1 text-sm"><a href={site.directions} className="underline">Get directions</a></p></div>
      </div>
      <div className="border-t border-ivory/15 py-4 text-center text-xs text-ivory/60">© {new Date().getFullYear()} {site.name}</div>
    </footer>
  );
}
