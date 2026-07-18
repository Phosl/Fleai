import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistration } from "@/components/pwa-registration";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Fleai — Trova valore al mercatino", template: "%s · Fleai" },
  description: "Analizza, valuta e rivendi i tuoi ritrovamenti con foto, comparabili citati e uno shop pronto.",
  applicationName: "Fleai",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "Fleai — Trova valore al mercatino",
    description: "Dal mercatino al tuo shop, con una ricerca più consapevole.",
    type: "website",
    locale: "it_IT",
  },
};

export const viewport: Viewport = {
  themeColor: "#17352f",
  colorScheme: "light",
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
