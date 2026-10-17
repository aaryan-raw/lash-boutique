"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
const KEY = "lb-recent-v1";
type R = { slug: string; name: string };
export default function RecentlyViewed({ current }: { current: R }) {
  const [list, setList] = useState<R[]>([]);
  useEffect(() => {
    try {
      const prev: R[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: read browser-only localStorage after mount
      setList(prev.filter((r) => r.slug !== current.slug).slice(0, 4));
      localStorage.setItem(KEY, JSON.stringify([current, ...prev.filter((r) => r.slug !== current.slug)].slice(0, 8)));
    } catch { /* storage unavailable */ }
  }, [current]);
  if (!list.length) return null;
  return <section className="container-page py-10"><h2 className="mb-4 text-2xl">Recently viewed</h2><ul className="flex flex-wrap gap-x-6 gap-y-2">{list.map((r) => <li key={r.slug}><Link href={`/product/${r.slug}`} className="underline-offset-4 hover:underline">{r.name}</Link></li>)}</ul></section>;
}
