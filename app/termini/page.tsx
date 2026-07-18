import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function TermsPage() {
  return <><SiteHeader /><main id="main" className="section"><article className="container" style={{ maxWidth: 760 }}><span className="eyebrow">Condizioni MVP</span><h1 className="title">Termini d’uso</h1><div className="lead" style={{ display: "grid", gap: 20, marginTop: 30 }}><p>Le analisi Fleai sono stime orientative basate sulle immagini e sulle fonti disponibili. Non costituiscono perizia, certificazione, verifica di autenticità o consulenza fiscale.</p><p>Il venditore è responsabile della correttezza dell’annuncio, delle condizioni dichiarate, della liceità dell’oggetto e degli accordi presi con l’acquirente.</p><p>Sono vietati beni illegali, pericolosi, contraffatti, medicinali, sostanze controllate e contenuti che violano diritti di terzi.</p></div></article></main><SiteFooter /></>;
}
