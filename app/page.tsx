import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Camera, Check, Search, ShoppingBag, Sparkles, Tags } from "lucide-react";
import { ItemCard } from "@/components/item-card";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { demoItems, demoReport } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";
import { absoluteUrl, HOME_FAQS, pageMetadata, SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Fleai — Valuta e rivendi oggetti trovati al mercatino",
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl("/")}#website`,
        url: absoluteUrl("/"),
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "it-IT",
      },
      {
        "@type": "Organization",
        "@id": `${absoluteUrl("/")}#organization`,
        name: SITE_NAME,
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon.svg"),
        },
        email: SITE_EMAIL,
      },
      {
        "@type": "WebApplication",
        "@id": `${absoluteUrl("/")}#app`,
        name: SITE_NAME,
        url: absoluteUrl("/"),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Qualsiasi sistema con browser moderno",
        inLanguage: "it-IT",
        description: SITE_DESCRIPTION,
        featureList: [
          "Identificazione di oggetti da una a tre foto",
          "Ricerca di comparabili con URL e data",
          "Stima prudente di prezzo, margine e ROI",
          "Creazione di bozze annuncio e immagini AI segnalate",
          "Shop pubblico senza checkout",
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: HOME_FAQS.map((faq) => ({
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
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">La ricerca intelligente per il second hand</span>
              <h1 className="display">OGGETTI<br />TROVATI.<br /><span style={{ color: "var(--coral)" }}>VALORE</span><br />SCOPERTO.</h1>
              <p className="lead">Fai una foto al mercatino. Fleai identifica l’oggetto, confronta fonti reali e ti aiuta a capire se comprarlo, tenerlo o trasformarlo in un annuncio pronto.</p>
              <div className="hero-actions">
                <Link href="/app/hunt/new" className="button button-coral">Inizia una ricerca <Camera size={18} /></Link>
                <Link href="/s/officina-ritrovata" className="button button-ghost">Esplora uno shop <ArrowRight size={18} /></Link>
              </div>
            </div>
            <div className="hero-art" aria-label="Esempio di sedia vintage analizzata da Fleai">
              <div className="hero-art-main"><Image src="/demo-chair.svg" alt="Illustrazione di una sedia cantilever vintage" fill priority loading="eager" sizes="(max-width: 980px) 80vw, 40vw" /></div>
              <div className="hero-price"><span>STIMA</span><strong>€145</strong></div>
              <div className="hero-tape">78% affidabile</div>
              <div className="hero-spark" aria-hidden="true">✦</div>
            </div>
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track"><span>SCATTA ✦ CERCA ✦ CONFRONTA ✦ DECIDI ✦ PUBBLICA ✦</span><span>SCATTA ✦ CERCA ✦ CONFRONTA ✦ DECIDI ✦ PUBBLICA ✦</span></div>
        </div>

        <section className="section" id="come-funziona">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Due modalità, un solo oggetto</span><h2 className="title">DAL BANCO<br />ALLA VETRINA.</h2></div>
              <p>La stessa analisi accompagna il ritrovamento in tutto il suo percorso. Nessuna foto o informazione da inserire due volte.</p>
            </div>
            <div className="flow-grid">
              <article className="flow-card flow-card-hunt">
                <span className="flow-number">01 / HUNTING</span>
                <div className="flow-icon"><Search size={42} /></div>
                <h3>Vale la pena comprarlo?</h3>
                <p>Identificazione, comparabili citati, fascia di rivendita, prezzo massimo e rischi visibili. La risposta prudente che ti serve mentre sei ancora al mercatino.</p>
                <Link href="/app/hunt/new" className="button button-white">Prova Hunting <ArrowRight size={17} /></Link>
              </article>
              <article className="flow-card flow-card-shop">
                <span className="flow-number">02 / SHOP</span>
                <div className="flow-icon"><ShoppingBag size={42} /></div>
                <h3>È pronto per essere venduto?</h3>
                <p>Scheda Vinted, immagini contestualizzate, virtual try-on, social pack e una vetrina pubblica. Tu confermi sempre condizioni, difetti e prezzo.</p>
                <Link href="/app/items/new" className="button">Crea un annuncio <ArrowRight size={17} /></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="section dark-section">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow" style={{ color: "var(--lime)" }}>Un report, non un’ipotesi</span><h2 className="title">FONTI VISIBILI.<br />DUBBI COMPRESI.</h2></div>
              <p>Fleai non promette certezze: rende leggibili le prove, segnala ciò che manca e abbassa l’affidabilità quando i comparabili non bastano.</p>
            </div>
            <div className="report-preview">
              <div className="report-image"><Image src="/demo-chair.svg" alt="Foto reale demo di una sedia vintage" width={900} height={1100} /></div>
              <div className="report-content">
                <div className="report-topline"><span className="eyebrow">Report Hunting</span><div className="score-ring"><strong>{demoReport.confidence.score}%</strong></div></div>
                <h3 className="subtitle">{demoReport.identification.label}</h3>
                <div className="decision"><span>La scelta prudente</span><strong>Buon acquisto per rivendita</strong></div>
                <div className="price-row">
                  <div className="price-box"><span>Acquisto</span><strong>{formatCurrency(demoReport.askingPrice)}</strong></div>
                  <div className="price-box"><span>Probabile</span><strong>{formatCurrency(demoReport.resaleLikely)}</strong></div>
                  <div className="price-box"><span>Margine basso</span><strong>{formatCurrency(demoReport.estimatedMargin)}</strong></div>
                </div>
                <ul className="check-list">
                  <li><Check size={18} /> Tre foto leggibili e condizioni osservabili</li>
                  <li><Check size={18} /> Comparabili in EUR con link e data</li>
                  <li><Check size={18} /> Produttore non verificato: controlla sotto la seduta</li>
                </ul>
                <Link href="/app/hunt/demo-report" className="button button-lime">Apri il report demo <ArrowRight size={17} /></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section dark-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="steps">
              <div className="step"><Camera size={26} /><h3>Scatta da 1 a 3 foto</h3><p>Fronte, retro, marchi e difetti. Le immagini reali restano sempre separate da quelle generate.</p></div>
              <div className="step"><Sparkles size={26} /><h3>Fleai ricerca e confronta</h3><p>Analizza i dettagli visibili e cerca annunci comparabili, mostrando link, data e tipo di prezzo.</p></div>
              <div className="step"><Tags size={26} /><h3>Decidi o pubblica</h3><p>Usa la stima al mercatino oppure trasforma il report in una bozza pronta da controllare.</p></div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="fleai-in-breve">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Fleai in breve</span><h2 className="title" id="fleai-in-breve">DATI UTILI.<br />LIMITI CHIARI.</h2></div>
              <p>Una ricerca assistita per prendere decisioni più informate, non una scorciatoia che nasconde l’incertezza.</p>
            </div>
            <div className="fact-grid">
              <article className="fact-card">
                <span>01</span>
                <h3>Fonti verificabili</h3>
                <p>I comparabili mostrano URL, data, valuta e natura del prezzo: richiesto, venduto o non verificabile.</p>
              </article>
              <article className="fact-card">
                <span>02</span>
                <h3>Stime prudenti</h3>
                <p>Sotto 50/100 di affidabilità Fleai chiede più informazioni. Con meno di due comparabili validi l’affidabilità resta bassa.</p>
              </article>
              <article className="fact-card">
                <span>03</span>
                <h3>Controllo umano</h3>
                <p>Prima di pubblicare, il venditore conferma descrizione, condizioni, difetti, prezzo e media visibili.</p>
              </article>
            </div>
            <div className="section-cta">
              <Link className="button button-ghost" href="/come-funziona">Leggi metodo e criteri <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>

        <section className="section faq-section" aria-labelledby="domande-frequenti">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Risposte dirette</span><h2 className="title" id="domande-frequenti">DOMANDE<br />FREQUENTI.</h2></div>
              <p>Le informazioni essenziali su analisi, categorie, autenticità e immagini generate.</p>
            </div>
            <div className="faq-list">
              {HOME_FAQS.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Vetrine Fleai</span><h2 className="title">STORIE IN<br />SECONDA MANO.</h2></div>
              <Link href="/s/officina-ritrovata" className="button button-ghost">Visita lo shop demo <ArrowRight size={17} /></Link>
            </div>
            <div className="item-grid">{demoItems.map((item) => <ItemCard key={item.id} item={item} />)}</div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
