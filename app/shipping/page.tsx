import { pageMeta } from "@/lib/seo";
import PolicyPage from "@/components/PolicyPage";
export const metadata = pageMeta("Shipping", "Shipping and delivery information for Lash Boutique orders.", "/shipping");
export default function Page() { return <PolicyPage title="Shipping" topics={["Delivery areas","Shipping charges","Delivery times","Courier partner"]} />; }
