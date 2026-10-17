"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { inr } from "@/lib/format";
import { useCart } from "./CartProvider";
import { openRazorpay } from "./PayButton";
type Quote = { lines: { sku: string; name: string; size: string; colour: string; qty: number; lineTotal: number; status: string }[]; subtotal: number; shipping: number | null; total: number | null; shippingError: string | null };
const shipMsg: Record<string, string> = { not_serviceable: "We cannot deliver to this PIN code yet.", shipping_not_configured: "Shipping rates are not set up yet. Please contact the store.", checkout_not_configured: "Checkout is not available yet." };
export default function CheckoutForm({ methods }: { methods: { online: boolean; cod: boolean } }) {
  const { items, ready, clear } = useCart();
  const router = useRouter();
  const [idemKey] = useState(() => crypto.randomUUID()); // one key per checkout page load: retries and double-clicks cannot create two orders
  const [f, setF] = useState({ name: "", phone: "", email: "", line1: "", line2: "", city: "", state: "Kerala", pincode: "" });
  const [pay, setPay] = useState<"online" | "cod">(methods.online ? "online" : "cod");
  const [consent, setConsent] = useState(false);
  const [q, setQ] = useState<Quote | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setMsg(""); };
  useEffect(() => {
    if (!ready || !items.length) return; let live = true;
    fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, pincode: f.pincode }) }).then((r) => r.json()).then((d) => live && setQ(d)).catch(() => live && setMsg("Could not load your order summary."));
    return () => { live = false; };
  }, [items, ready, f.pincode]);
  if (!ready) return <p role="status" aria-busy="true">Loading…</p>;
  if (!items.length) return <p>Your cart is empty. <Link href="/shop" className="underline">Continue shopping</Link></p>;
  const bad = q?.lines.some((l) => l.status === "out_of_stock" || l.status === "unavailable" || l.status === "reduced");
  const field = (k: keyof typeof f, label: string, extra: Record<string, string> = {}) => (<div><label htmlFor={k} className="field-label">{label}</label><input id={k} className="field" value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} aria-describedby={errs[k] ? `${k}-e` : undefined} {...extra} />{errs[k] && <p id={`${k}-e`} className="field-error">{errs[k]}</p>}</div>);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMsg(""); setErrs({});
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, customer: { name: f.name, phone: f.phone, email: f.email || undefined }, address: { line1: f.line1, line2: f.line2 || undefined, city: f.city, state: f.state, pincode: f.pincode }, paymentMethod: pay, consent, idempotencyKey: idemKey }) });
      const d = await r.json();
      if (r.status === 422 && d.details && d.error === "validation_failed") { setErrs(d.details); setMsg("Please fix the highlighted fields."); const first = ["name", "phone", "email", "line1", "line2", "city", "state", "pincode", "consent"].find((k) => d.details[k]); if (first) setTimeout(() => document.getElementById(first)?.focus(), 0); }
      else if (!r.ok) setMsg(d.error === "insufficient_stock" || d.error === "item_unavailable" ? "An item in your cart is no longer available in that quantity. Please review your cart." : shipMsg[d.error] ?? "We could not place your order. Please try again.");
      else if (d.razorpay) await openRazorpay(d.razorpay, (ref) => { clear(); router.push(`/order/${ref ?? d.order.ref}`); }, () => { clear(); router.push(`/order/${d.order.ref}`); });
      else { clear(); router.push(`/order/${d.order.ref}`); }
    } catch { setMsg("Network problem. Your order was not duplicated; please try again."); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-10 md:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <h2 className="text-2xl">Contact</h2>{field("name", "Full name", { autoComplete: "name" })}{field("phone", "Mobile number", { autoComplete: "tel", inputMode: "tel" })}{field("email", "Email (optional, for order updates)", { autoComplete: "email", type: "email" })}
        <h2 className="pt-4 text-2xl">Delivery address</h2>{field("line1", "Address line 1", { autoComplete: "address-line1" })}{field("line2", "Address line 2 (optional)")}{field("city", "City")}{field("state", "State")}{field("pincode", "PIN code", { inputMode: "numeric", maxLength: "6", autoComplete: "postal-code" })}
        <fieldset className="pt-4"><legend className="text-2xl">Payment</legend>
          {methods.online && <label className="mt-2 flex items-center gap-2"><input type="radio" name="pay" checked={pay === "online"} onChange={() => setPay("online")} className="accent-burgundy" />Pay online (UPI, cards, netbanking via Razorpay)</label>}
          {methods.cod && <label className="mt-2 flex items-center gap-2"><input type="radio" name="pay" checked={pay === "cod"} onChange={() => setPay("cod")} className="accent-burgundy" />Cash on delivery</label>}</fieldset>
        <label className="flex items-start gap-2 text-sm"><input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-burgundy" aria-invalid={!!errs.consent} aria-describedby={errs.consent ? "consent-e" : undefined} />I agree that Lash Boutique may use these details to process and deliver my order (see <Link href="/privacy" className="underline">Privacy</Link>).</label>{errs.consent && <p id="consent-e" className="field-error">{errs.consent}</p>}
      </div>
      <aside className="h-fit border border-line bg-cream p-5" aria-label="Order summary"><h2 className="text-2xl">Summary</h2>
        {!q ? <p role="status" aria-busy="true" className="mt-3 text-sm">Loading…</p> : <>
          <ul className="mt-3 space-y-2 text-sm">{q.lines.map((l) => <li key={l.sku} className="flex justify-between gap-2"><span>{l.name} · {l.size} × {l.qty}</span><span>{inr(l.lineTotal)}</span></li>)}</ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(q.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{q.shipping === null ? (f.pincode.length === 6 ? "—" : "Enter PIN code") : q.shipping === 0 ? "Free" : inr(q.shipping)}</dd></div>
            <div className="flex justify-between text-base font-medium"><dt>Total</dt><dd>{q.total === null ? "—" : inr(q.total)}</dd></div></dl>
          {q.shippingError && f.pincode.length === 6 && <p role="alert" className="mt-3 text-sm text-burgundy">{shipMsg[q.shippingError] ?? "Shipping cannot be calculated."}</p>}
          {bad && <p role="alert" className="mt-3 text-sm text-burgundy">Some items changed. <Link href="/cart" className="underline">Review your cart</Link>.</p>}</>}
        <button className="btn-primary mt-5 w-full" disabled={busy || !q || !!bad} aria-busy={busy}>{busy ? "Placing order…" : "Place order"}</button>
        <p role="status" className="mt-3 text-sm text-burgundy">{msg}</p>
      </aside>
    </form>
  );
}
