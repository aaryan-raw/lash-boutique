"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";
import { useCart } from "./CartProvider";
export default function Header() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, []);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <button className="btn-ghost -ml-2 px-2 xs:-ml-3 xs:px-3 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={open ? "M5 5l14 14M19 5L5 19" : "M3 7h18M3 12h18M3 17h18"} /></svg>
        </button>
        <Link href="/" className="whitespace-nowrap font-serif text-xl font-semibold tracking-wide text-ink xs:text-2xl">{site.name}</Link>
        <nav aria-label="Main" className="hidden lg:block"><ul className="flex gap-8 text-sm">{nav.map((n) => <li key={n.href}><Link href={n.href} className="py-2 hover:text-burgundy">{n.label}</Link></li>)}</ul></nav>
        <div className="flex items-center gap-1">
          <form action="/shop" role="search" className="hidden md:block"><label htmlFor="q" className="sr-only">Search products</label><input id="q" name="q" type="search" placeholder="Search" className="field w-44" /></form>
          <Link href="/shop" className="btn-ghost px-2 xs:px-3 md:hidden" aria-label="Search products"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></Link>
          <Link href="/cart" className="btn-ghost whitespace-nowrap px-2 xs:px-3" aria-label={`Cart, ${count} items`}>Cart ({count})</Link>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-ivory lg:hidden">
          <ul className="container-page py-2">{nav.map((n) => <li key={n.href}><Link href={n.href} onClick={() => setOpen(false)} className="block border-b border-line py-3 text-base">{n.label}</Link></li>)}
            <li><Link href="/contact" onClick={() => setOpen(false)} className="block py-3 text-base">Visit the Store</Link></li></ul>
        </nav>
      )}
    </header>
  );
}
