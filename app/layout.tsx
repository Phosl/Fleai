import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistration } from "@/components/pwa-registration";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: SITE_TITLE,
    template: "%s · Fleai",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "shopping",
  keywords: [
    "mercatini dell'usato",
    "valutazione oggetti usati",
    "ricerca oggetti con foto",
    "rivendita second hand",
    "comparabili di prezzo",
    "creare annuncio Vinted",
  ],
  authors: [{ name: SITE_NAME, url: absoluteUrl("/") }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "it_IT",
    siteName: SITE_NAME,
    url: absoluteUrl("/"),
    images: [{
      url: absoluteUrl("/opengraph-image"),
      width: 1200,
      height: 630,
      alt: SITE_TITLE,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/opengraph-image")],
  },
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification
      ? { other: { "msvalidate.01": bingVerification } }
      : {}),
  },
  formatDetection: { address: false, email: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#17352f",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">Vai al contenuto</a>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
