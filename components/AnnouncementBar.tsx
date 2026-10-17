import Link from "next/link";
import { site } from "@/lib/site";
export default function AnnouncementBar() {
  const a = site.announcement;
  if (!a.enabled) return null;
  return <aside aria-label="Announcement" className="bg-sage-dark px-4 py-2 text-center text-xs tracking-wide text-ivory"><Link href={a.href} className="hover:underline">{a.message}</Link></aside>;
}
