import { pageMeta } from "@/lib/seo";
import { Notice } from "@/components/Section";
import { showDraftNotices } from "@/lib/site";
export const metadata = pageMeta("About", "About Lash Boutique, a women\u0027s fashion boutique in Kannammoola, Thiruvananthapuram.", "/about");
export default function About() {
  return (<div className="container-page max-w-3xl py-12"><h1 className="text-4xl md:text-5xl">About Lash Boutique</h1>
    <p className="mt-6 text-muted">Lash Boutique is a women&apos;s fashion boutique in Kannammoola, Thiruvananthapuram, offering kurtis, cord sets, sarees and more.</p>
    {showDraftNotices() && <div className="mt-6"><Notice>PLACEHOLDER: the founding story, team and values will be written with the owner.</Notice></div>}</div>);
}
