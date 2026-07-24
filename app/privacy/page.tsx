import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_EMAIL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Come Fleai tratta account, foto degli oggetti, analisi AI e richieste di prenotazione.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <><SiteHeader /><main id="main" className="section"><article className="container legal-page"><span className="eyebrow">Informativa MVP · luglio 2026</span><h1 className="title">Privacy</h1><p className="lead">Questa pagina spiega in modo sintetico quali dati usa Fleai per fornire il servizio e quali contenuti possono diventare pubblici.</p><h2>Dati trattati</h2><p>Fleai tratta dati dell’account, foto e informazioni sugli oggetti, risultati delle analisi, dati tecnici di utilizzo e richieste di prenotazione inviate agli shop.</p><h2>Foto private e media pubblici</h2><p>Gli upload e le lavorazioni restano privati. Soltanto i media approvati dal venditore vengono copiati nell’area pubblica quando un annuncio viene pubblicato. Le visualizzazioni generate dall’AI restano distinte dalle foto reali.</p><h2>Fornitori del servizio</h2><p>Il servizio può utilizzare fornitori tecnici per hosting, database e autenticazione, analisi AI, invio email e protezione antispam. Sono conservati output normalizzati e metadati utili; i prompt grezzi non vengono inseriti nei log applicativi.</p><h2>Conservazione e sicurezza</h2><p>Gli upload orfani sono programmati per la rimozione dopo 24 ore. Le email delle richieste chiuse sono programmate per la rimozione dopo 90 giorni. L’accesso ai dati privati è limitato al proprietario e agli amministratori autorizzati.</p><h2>Scelte e contatti</h2><p>Non caricare foto di persone, documenti, dati sensibili o beni di cui non hai diritto di disporre. Per informazioni o richieste relative ai tuoi dati scrivi a <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.</p></article></main><SiteFooter /></>;
}
