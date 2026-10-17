export const site = {
  name: "Lash Boutique",
  tagline: "Women's fashion · Kannammoola, Thiruvananthapuram",
  phoneDisplay: "+91 99957 82624",
  phoneTel: "+919995782624",
  // WhatsApp uses the supplied phone number; owner to confirm it is a WhatsApp number.
  whatsapp: "https://wa.me/919995782624",
  address: ["Opposite CSI Church Auditorium", "Kannammoola, Thiruvananthapuram", "Kerala 695011"],
  directions: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Lash Boutique, Opposite CSI Church Auditorium, Kannammoola, Thiruvananthapuram, Kerala 695011"),
  // Owner-supplied figure, not independently verified. Show with that caveat until confirmed.
  rating: { value: "4.7", count: "968", note: "Owner-supplied Google Business figure, pending verification" },
  // No social profiles supplied; leave empty rather than inventing links.
  social: [] as { label: string; href: string }[],
  announcement: { enabled: true, message: "Visit us opposite CSI Church Auditorium, Kannammoola", href: "/contact" },
};
export const nav = [
  { label: "New Arrivals", href: "/collections/new-arrivals" },
  { label: "Kurtis", href: "/category/kurtis" },
  { label: "Cord Sets", href: "/category/cord-sets" },
  { label: "Sarees", href: "/category/sarees" },
  { label: "Shop All", href: "/shop" },
];
export const policyLinks = [
  { label: "Shipping", href: "/shipping" }, { label: "Returns & Exchange", href: "/returns" },
  { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" },
];
// Includes an absolute product link only when NEXT_PUBLIC_SITE_URL is configured (domain not yet decided).
export const whatsappFor = (productName: string, path: string) => {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return `${site.whatsapp}?text=${encodeURIComponent(`Hi Lash Boutique, I would like to ask about: ${productName}${base ? `\n${base}${path}` : ""}`)}`;
};

/** Draft/pending-content notices are shown until the owner approves the copy: set SHOW_DRAFT_NOTICES=false at launch. */
export const showDraftNotices = () => process.env.SHOW_DRAFT_NOTICES !== "false";
