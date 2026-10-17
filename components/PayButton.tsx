"use client";
import { useState } from "react";
type Rz = { keyId: string; orderId: string; amount: number };
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } } }
const loadScript = () => new Promise<boolean>((res) => { if (window.Razorpay) return res(true); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => res(true); s.onerror = () => res(false); document.body.appendChild(s); });
/** Opens Razorpay Checkout (card details are entered in Razorpay's hosted widget, never on this site) and then asks the server to verify the payment. */
export async function openRazorpay(rz: Rz, onDone: (ref: string | null) => void, onDismiss: () => void) {
  if (!(await loadScript()) || !window.Razorpay) return onDone(null);
  new window.Razorpay({ key: rz.keyId, order_id: rz.orderId, amount: rz.amount, currency: "INR", name: "Lash Boutique", modal: { ondismiss: onDismiss },
    handler: async (r: Record<string, string>) => { const v = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) }); onDone(v.ok ? ((await v.json()) as { ref: string }).ref : null); } }).open();
}
export default function PayButton({ orderRef }: { orderRef: string }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  return (<div><button className="btn-primary" aria-busy={busy} disabled={busy} onClick={async () => {
      setBusy(true); setMsg("");
      const r = await fetch("/api/checkout/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: orderRef }) });
      if (!r.ok) { setBusy(false); return setMsg("Payment is not available for this order."); }
      const { razorpay } = (await r.json()) as { razorpay: Rz };
      await openRazorpay(razorpay, (ref) => { if (ref) window.location.reload(); else { setBusy(false); setMsg("We could not confirm your payment. If money was deducted, contact the store with your order reference."); } }, () => setBusy(false));
    }}>Complete payment</button><p role="status" className="mt-2 text-sm text-burgundy">{msg}</p></div>);
}
