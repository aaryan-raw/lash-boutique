import { site } from "@/lib/site";
export default function ContactActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <a href={site.whatsapp} className="btn-primary" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
      <a href={`tel:${site.phoneTel}`} className="btn-secondary">Call {site.phoneDisplay}</a>
      <a href={site.directions} className="btn-secondary" target="_blank" rel="noopener noreferrer">Get directions</a>
    </div>
  );
}
