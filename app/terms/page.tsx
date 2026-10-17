import { pageMeta } from "@/lib/seo";
import PolicyPage from "@/components/PolicyPage";
export const metadata = pageMeta("Terms", "Terms of use for the Lash Boutique website and orders.", "/terms");
export default function Page() { return <PolicyPage title="Terms" topics={["Orders and pricing","Payments","Liability","Governing law"]} />; }
