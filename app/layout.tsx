import type { Metadata } from "next";
import "./globals.css";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { robotsMeta, siteUrl } from "@/lib/seo";
import { CartProvider } from "@/components/CartProvider";
export function generateMetadata(): Metadata {
  return {
    metadataBase: siteUrl() ? new URL(siteUrl()!) : undefined,
    title: { default: "Lash Boutique | Women's kurtis, cord sets & sarees in Kannammoola, Thiruvananthapuram", template: "%s | Lash Boutique" },
    description: "Lash Boutique is a women's fashion boutique in Kannammoola, Thiruvananthapuram, with kurtis, cord sets, sarees and more. Visit the store or shop online.",
    robots: robotsMeta(), openGraph: { siteName: "Lash Boutique", locale: "en_IN", type: "website" },
  };
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-ivory focus:p-3">Skip to content</a>
      <CartProvider><AnnouncementBar /><Header /><main id="main">{children}</main><Footer /></CartProvider>
    </body></html>
  );
}
