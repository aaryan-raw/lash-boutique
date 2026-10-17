import { ShippingForm } from "@/components/AdminForms";
import { Notice } from "@/components/Section";
import { adminDb, requireAdminPage } from "@/lib/admin-page";
import { getShipping } from "@/lib/orders";
export default async function Settings() {
  await requireAdminPage(); const db = adminDb(); if (!db) return <Notice>The database is not connected.</Notice>;
  return (<div><h1 className="mb-2 text-3xl">Shipping settings</h1><p className="mb-6 text-muted">Checkout stays disabled until these are set. Charges apply per order; courier and tracking are entered manually on each order.</p><ShippingForm s={await getShipping(db)} /></div>);
}
