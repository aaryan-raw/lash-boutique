import Link from "next/link";
import { LogoutButton } from "@/components/AdminForms";
import { requireAdminPage } from "@/lib/admin-page";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (<div className="container-page py-8"><nav aria-label="Admin" className="mb-8 flex flex-wrap items-center gap-2 border-b border-line pb-3"><Link href="/admin/orders" className="btn-ghost">Orders</Link><Link href="/admin/products" className="btn-ghost">Products</Link><Link href="/admin/settings" className="btn-ghost">Shipping</Link><span className="ml-auto"><LogoutButton /></span></nav>{children}</div>);
}
