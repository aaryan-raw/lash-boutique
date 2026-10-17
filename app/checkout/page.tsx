import CheckoutForm from "@/components/CheckoutForm";
import { Notice } from "@/components/Section";
import { getDb } from "@/lib/db";
import { getShipping } from "@/lib/orders";
import { paymentMethods } from "@/lib/payments";
export const metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Checkout() {
  const db = getDb(), m = paymentMethods();
  const shipping = db ? await getShipping(db) : null;
  const problems = [!db && "the order database is not connected", !m.online && !m.cod && "no payment method has been enabled", db && !shipping && "shipping rates and delivery areas have not been set"].filter(Boolean);
  return (
    <div className="container-page min-h-[60vh] max-w-4xl py-12"><h1 className="text-4xl md:text-5xl">Checkout</h1>
      {problems.length > 0 ? <div className="my-6"><Notice>Online ordering is not available yet ({problems.join("; ")}). Please order by WhatsApp or visit the store.</Notice></div> : <div className="mt-8"><CheckoutForm methods={m} /></div>}
    </div>
  );
}
