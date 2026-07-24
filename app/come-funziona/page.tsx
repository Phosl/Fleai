import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Search, ShieldCheck, Tags } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Come funziona Fleai — metodo, affidabilità e limiti",
  description: "Scopri come Fleai analizza le foto, cerca comparabili citati, calcola affidabilità e stime prudenti e prepara annunci second hand trasparenti.",
  alternates: { canonical: "/come-funziona" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: "Come funziona Fleai — metodo, affidabilità e limiti",
    description: "Foto, comparabili citati, stime prudenti e controllo umano prima della pubblicazione.",
    type: "article",
    locale: "it_IT",
    url: absoluteUrl("/come-funziona"),
  },
};

const methodologyFaqs = [
  {
    question: "Come viene calcolata l’affidabilità?",
    answer: "Il punteggio da 0 a 100 considera copertura fotografica, precisione dell’identificazione, numero e somiglianza dei comparabili e recenza e coerenza dei prezzi. Con meno di due comparabili validi il risultato resta a bassa affidabilità.",
  },
  {
    question: "Quando Fleai dice che un acquisto conviene?",
    answer: "Solo con affidabilità di almeno 50/100 e quando il prezzo richiesto resta sotto il massimo compatibile con almeno 15 euro di margine e il 30% di ROI, calcolati sulla stima bassa.",
  },
  {
    question: "Che cosa devo fotografare?",
    answer: "Da una a tre immagini nitide: vista generale, retro o fondo, marchi, etichette, firme, seriali e difetti. Per oggetti firmati o potenzialmente importanti sono necessari più dettagli e può servire una verifica professionale.",
  },
  {
    question: "Quali prezzi entrano nella stima?",
    answer: "Nell’MVP entrano nella stima numerica i comparabili in euro pertinenti e sufficientemente recenti. Prezzi in altre valute o non verificabili possono essere mostrati come contesto, ma vengono esclusi dal calcolo.",
  },
] as const;

export default function HowItWorksPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Come funziona Fleai",
        url: absoluteUrl("/come-funziona"),
        description: "Metodo di analisi, ricerca dei comparabili, affidabilità, stime e limiti di Fleai.",
        inLanguage: "it-IT",
        dateModified: "2026-07-23",
        isPartOf: { "@type": "WebSite", name: "Fleai", url: absoluteUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: methodologyFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <>
      <SiteHeader />
      <JsonLd data={structuredData} />
      <main id="main">
        <section className="method-hero">
          <div className="container method-hero-grid">
            <div>
              <span className="eyebrow">Metodo Fleai · aggiornato luglio 2026</span>
              <h1 className="title">DALLA FOTO A UNA DECISIONE SPIEGABILE.</h1>
            </div>
            <div className="method-intro">
              <p>Fleai aiuta a valutare e presentare oggetti second hand. Combina ciò che è visibile nelle foto con comparabili online citati, poi mostra stima, rischi e informazioni mancanti.</p>
              <p>Non certifica autenticità, rarità o valore e non sostituisce una perizia professionale.</p>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="processo">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Il processo</span><h2 className="title" id="processo">QUATTRO PASSAGGI.<br />NESSUN SALTO.</h2></div>
              <p>La pipeline è condivisa tra Hunting e Shop: foto e analisi già disponibili vengono riutilizzate.</p>
            </div>
            <div className="method-grid">
              <article className="method-card"><Camera size={28} /><span>01</span><h3>Input dell’utente</h3><p>Da 1 a 3 foto, categoria, breve descrizione e, per Hunting, prezzo richiesto e costi extra.</p></article>
              <article className="method-card"><ShieldCheck size={28} /><span>02</span><h3>Ispezione visiva</h3><p>Identifica elementi osservabili, possibili materiali, marca o modello e separa con chiarezza ciò che non è verificabile.</p></article>
              <article className="method-card"><Search size={28} /><span>03</span><h3>Ricerca citata</h3><p>Cerca comparabili pertinenti e registra fonte, URL, data, valuta, tipo di prezzo e somiglianza.</p></article>
              <article className="method-card"><Tags size={28} /><span>04</span><h3>Sintesi e controllo</h3><p>Calcola stima e affidabilità. L’utente controlla condizioni, difetti, prezzo e immagini prima di pubblicare.</p></article>
            </div>
          </div>
        </section>

        <section className="section dark-section" aria-labelledby="affidabilita">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow" style={{ color: "var(--lime)" }}>Punteggio 0–100</span><h2 className="title" id="affidabilita">COME LEGGERE<br />L’AFFIDABILITÀ.</h2></div>
              <p>Il punteggio non misura se l’oggetto è “bello”: misura quanto sono solide le informazioni disponibili per quella specifica analisi.</p>
            </div>
            <div className="confidence-grid">
              <article><strong>Foto</strong><p>Numero, nitidezza, angolazioni, marchi e difetti visibili.</p></article>
              <article><strong>Identificazione</strong><p>Precisione di categoria, oggetto, marca, modello e periodo.</p></article>
              <article><strong>Comparabili</strong><p>Numero di fonti valide e somiglianza con l’oggetto fotografato.</p></article>
              <article><strong>Prezzi</strong><p>Recenza, coerenza, valuta e distinzione tra richiesto e venduto.</p></article>
            </div>
            <div className="method-rule">
              <CheckCircle2 size={25} />
              <p><strong>Regola prudente:</strong> sotto 50/100 Fleai mostra “servono più informazioni”. Con meno di due comparabili validi l’affidabilità è sempre bassa.</p>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="categorie">
          <div className="container methodology-columns">
            <div>
              <span className="eyebrow">Ambito MVP</span>
              <h2 className="subtitle" id="categorie">Categorie supportate</h2>
              <ul className="plain-check-list">
                <li>Moda, calzature, borse e accessori</li>
                <li>Casa, design, mobili, illuminazione e ceramiche</li>
                <li>Arte, decorazione, libri, dischi e media</li>
                <li>Tecnologia, fotografia e audio</li>
                <li>Giochi, sport e strumenti musicali</li>
                <li>Collezionabili non regolamentati</li>
              </ul>
            </div>
            <div>
              <span className="eyebrow">Esclusioni e cautela</span>
              <h2 className="subtitle">Cosa Fleai non accetta</h2>
              <p>Armi, medicinali, sostanze, materiale illecito e oggetti dichiaratamente contraffatti sono bloccati. Per beni firmati o potenzialmente importanti Fleai richiede foto di etichette, firme, seriali e difetti e consiglia una verifica professionale.</p>
              <p>Le visualizzazioni contestualizzate e i try-on usano modelli sintetici adulti e riportano il badge “Visualizzazione AI”. Vestibilità e proporzioni restano indicative.</p>
            </div>
          </div>
        </section>

        <section className="section faq-section" aria-labelledby="faq-metodo">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Dettagli operativi</span><h2 className="title" id="faq-metodo">FAQ SUL<br />METODO.</h2></div>
            </div>
            <div className="faq-list">
              {methodologyFaqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
            <div className="method-final-cta">
              <div><span className="eyebrow">Prova sul campo</span><h2>Hai già trovato un oggetto?</h2></div>
              <Link href="/app/hunt/new" className="button button-coral">Inizia una ricerca <ArrowRight size={18} /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
