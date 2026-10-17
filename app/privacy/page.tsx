import { pageMeta } from "@/lib/seo";
import PolicyPage from "@/components/PolicyPage";
export const metadata = pageMeta("Privacy policy", "How Lash Boutique handles your personal information.", "/privacy");
export default function Page() { return <PolicyPage title="Privacy Policy" topics={["Data collected","Use of data","Contact for privacy requests"]} />; }
