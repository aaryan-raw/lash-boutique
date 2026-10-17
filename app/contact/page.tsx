import { pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { localBusinessLd } from "@/lib/seo";
import ContactActions from "@/components/ContactActions";
import { Notice } from "@/components/Section";
import { showDraftNotices, site } from "@/lib/site";
export const metadata = pageMeta("Visit the store", "Find Lash Boutique opposite CSI Church Auditorium, Kannammoola, Thiruvananthapuram. Call, WhatsApp or get directions.", "/contact");
export default function Contact() {
  return (<div className="container-page max-w-3xl py-12"><JsonLd data={localBusinessLd()} /><h1 className="text-4xl md:text-5xl">Visit the store</h1>
    <address className="mt-6 text-lg not-italic">{site.address.map((l) => <span key={l} className="block">{l}</span>)}</address>
    <p className="mt-3"><a href={`tel:${site.phoneTel}`} className="underline">{site.phoneDisplay}</a></p>
    <div className="my-8"><ContactActions /></div>
    {showDraftNotices() && <Notice>PLACEHOLDER: opening hours and an embedded map are pending owner confirmation.</Notice>}</div>);
}
