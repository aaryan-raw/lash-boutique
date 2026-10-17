import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
export default async function Admin() { await requireAdminPage(); redirect("/admin/orders"); }
