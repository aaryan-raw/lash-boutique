import Link from "next/link";
import type { ReactNode } from "react";
export function Section({ eyebrow, title, href, linkLabel, children, tone = "ivory" }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; children: ReactNode; tone?: "ivory" | "cream" }) {
  return (
    <section className={`${tone === "cream" ? "bg-cream" : ""} py-12 md:py-16`}>
      <div className="container-page">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h2 className="text-3xl md:text-4xl">{title}</h2></div>
          {href && <Link href={href} className="text-sm font-medium text-burgundy underline-offset-4 hover:underline">{linkLabel ?? "View all"}</Link>}
        </div>
        {children}
      </div>
    </section>
  );
}
export const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{children}</div>;
export const Notice = ({ children }: { children: ReactNode }) => <p role="note" className="border border-gold/60 bg-cream px-4 py-3 text-sm text-muted">{children}</p>;
