import { pageMeta } from "@/lib/seo";
import PolicyPage from "@/components/PolicyPage";
export const metadata = pageMeta("Returns & exchange", "Returns and exchange policy for Lash Boutique orders.", "/returns");
export default function Page() { return <PolicyPage title="Returns & Exchange" topics={["Eligibility window","Condition of items","Exchange process","Refunds"]} />; }
