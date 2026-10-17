import type { Product } from "@/lib/types";
import { effectivePrice, isOnSale } from "@/lib/catalogue";
import { inr } from "@/lib/format";
export default function Price({ p, large = false }: { p: Product; large?: boolean }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-2 ${large ? "text-xl" : "text-sm"}`}>
      <span className={isOnSale(p) ? "font-medium text-burgundy" : ""}>{inr(effectivePrice(p))}</span>
      {isOnSale(p) && <><s className="text-muted"><span className="sr-only">Original price </span>{inr(p.price)}</s><span className="badge">Sale</span></>}
      {p.devData && <span className="text-xs text-muted">(sample price)</span>}
    </p>
  );
}
