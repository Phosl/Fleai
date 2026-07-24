import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Pagina non trovata",
  robots: { index: false, follow: false, noarchive: true },
};

export default function NotFoundPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="section">
        <section className="container not-found-card">
          <span className="eyebrow">Errore 404</span>
          <h1 className="title">QUESTO OGGETTO<br />NON È QUI.</h1>
          <p className="lead">
            La pagina potrebbe essere stata archiviata, venduta oppure non
            essere mai esistita.
          </p>
          <Link href="/" className="button button-coral">
            <ArrowLeft size={17} /> Torna alla home
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
