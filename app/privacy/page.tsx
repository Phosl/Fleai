import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
  return <><SiteHeader /><main id="main" className="section"><article className="container" style={{ maxWidth: 760 }}><span className="eyebrow">Informativa MVP</span><h1 className="title">Privacy</h1><div className="lead" style={{ display: "grid", gap: 20, marginTop: 30 }}><p>Fleai tratta account, foto degli oggetti, analisi e richieste di prenotazione per fornire il servizio. Le foto di lavoro sono private; diventano pubbliche soltanto quelle approvate per un annuncio.</p><p>Non caricare foto di persone, documenti, dati sensibili o beni di cui non hai diritto di disporre. Gli upload orfani vengono eliminati dopo 24 ore; le email delle richieste chiuse dopo 90 giorni.</p><p>Questa pagina è una bozza funzionale dell’MVP e dovrà essere sostituita da un’informativa legale completa prima del lancio pubblico.</p></div></article></main><SiteFooter /></>;
}
