import { notFound } from "next/navigation";
import { ProductForm } from "@/components/AdminForms";
import { Notice } from "@/components/Section";
import { adminDb, requireAdminPage } from "@/lib/admin-page";
import { listProductsAdmin } from "@/lib/admin-service";
import { categories } from "@/lib/catalogue";
export default async function Edit(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requireAdminPage(); const db = adminDb(); if (!db) return <Notice>The database is not connected.</Notice>;
  const p = params.id === "new" ? undefined : (await listProductsAdmin(db)).find((x) => x.id === params.id);
  if (params.id !== "new" && !p) notFound();
  return (<div><h1 className="mb-6 text-3xl">{p ? "Edit product" : "New product"}</h1><ProductForm p={p} categories={categories} /></div>);
}
