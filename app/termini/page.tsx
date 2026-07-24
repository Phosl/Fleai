import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_EMAIL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Termini d’uso",
  description: "Regole, limiti delle stime e responsabilità per l’utilizzo di Fleai.",
  alternates: { canonical: "/termini" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <><SiteHeader /><main id="main" className="section"><article className="container legal-page"><span className="eyebrow">Condizioni MVP · luglio 2026</span><h1 className="title">Termini d’uso</h1><p className="lead">Usando Fleai accetti di controllare sempre i risultati prima di acquistare, pubblicare o vendere un oggetto.</p><h2>Natura delle analisi</h2><p>Le analisi Fleai sono stime orientative basate sulle immagini, sulle informazioni fornite e sulle fonti disponibili. Non costituiscono perizia, certificazione, verifica di autenticità, garanzia di vendita o consulenza fiscale.</p><h2>Responsabilità del venditore</h2><p>Il venditore è responsabile della correttezza dell’annuncio, delle condizioni e dei difetti dichiarati, della liceità dell’oggetto e degli accordi presi con l’acquirente. Descrizione, prezzo e media devono essere confermati prima della pubblicazione.</p><h2>Oggetti vietati</h2><p>Sono vietati beni illegali, pericolosi o dichiaratamente contraffatti, armi, medicinali, sostanze controllate e contenuti che violano diritti di terzi.</p><h2>Shop e prenotazioni</h2><p>Fleai non gestisce pagamenti, spedizioni o checkout. Una richiesta di prenotazione non conclude automaticamente una vendita: consegna, pagamento e altri dettagli vengono concordati direttamente con il venditore.</p><h2>Contatti</h2><p>Per domande sul servizio scrivi a <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.</p></article></main><SiteFooter /></>;
}
