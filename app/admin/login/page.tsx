import { LoginForm } from "@/components/AdminForms";
import { Notice } from "@/components/Section";
import { adminConfigured } from "@/lib/auth";
export const metadata = { title: "Admin sign in", robots: { index: false } };
export const dynamic = "force-dynamic";
export default function Login() {
  return (<div className="container-page py-16"><h1 className="mb-8 text-center text-4xl">Admin sign in</h1>
    {!adminConfigured() && <div className="mx-auto mb-6 max-w-sm"><Notice>Admin login is not configured: set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and SESSION_SECRET (see README).</Notice></div>}<LoginForm /></div>);
}
