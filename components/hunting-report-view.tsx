import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, ExternalLink, Info, ShieldQuestion } from "lucide-react";
import { Notice } from "@/components/notice";
import type { HuntingReportDTO } from "@/lib/contracts";
import { formatCurrency, formatDate } from "@/lib/format";
import { ConvertToShopButton } from "@/components/convert-to-shop-button";

const recommendations = {
  buy_to_resell: { title: "Buon acquisto per rivendita", copy: "Il prezzo richiesto è sotto la soglia prudente calcolata sulla stima bassa." },
  good_potential: { title: "Interessante, ma tratta il prezzo", copy: "C’è potenziale, ma il margine non raggiunge ancora l’obiettivo prudente." },
  pass: { title: "Meglio lasciarlo", copy: "Margine o rischi non giustificano l’acquisto nelle condizioni osservate." },
  needs_more_info: { title: "Servono più informazioni", copy: "Le prove non bastano per dare una raccomandazione d’acquisto affidabile." },
} as const;

export function HuntingReportView({ report, itemId }: { report: HuntingReportDTO; itemId?: string }) {
  const recommendation = recommendations[report.recommendation];
  return (
    <div className="report-page-grid">
      <div>
        <section className="report-hero">
          <div className="report-hero-top">
            <div><span className="eyebrow" style={{ color: "var(--lime)" }}>Report completato</span><h1>{report.identification.label}</h1><p style={{ color: "#aec1bb", margin: 0 }}>{report.identification.era} · {report.identification.materials.join(", ")}</p></div>
            <div className="confidence-chip"><strong>{report.confidence.score}%</strong><span>affidabilità {report.confidence.label === "high" ? "alta" : report.confidence.label === "medium" ? "media" : "bassa"}</span></div>
          </div>
          <div className="report-result"><span className="result-icon">{report.recommendation === "buy_to_resell" ? <Check /> : <Info />}</span><span><small className="muted">La scelta prudente</small><strong style={{ display: "block", fontSize: 20 }}>{recommendation.title}</strong><span style={{ fontSize: 13, color: "var(--muted)" }}>{recommendation.copy}</span></span></div>
        </section>

        <section className="report-section">
          <h2>Fascia di mercato osservata</h2>
          <div className="price-row">
            <div className="price-box"><span>Stima bassa</span><strong>{formatCurrency(report.resaleLow)}</strong></div>
            <div className="price-box" style={{ background: "var(--lime)" }}><span>Più probabile</span><strong>{formatCurrency(report.resaleLikely)}</strong></div>
            <div className="price-box"><span>Stima alta</span><strong>{formatCurrency(report.resaleHigh)}</strong></div>
          </div>
          <div className="report-price-secondary">
            <div className="price-box"><span>Non pagare più di</span><strong>{formatCurrency(report.suggestedMaxBuy)}</strong></div>
            <div className="price-box"><span>Margine sulla stima bassa</span><strong>{formatCurrency(report.estimatedMargin)}</strong></div>
          </div>
        </section>

        <section className="report-section">
          <h2>Comparabili citati</h2>
          <div className="source-list">{report.comparables.map((source) => (
            <a className="source-row" href={source.url} target="_blank" rel="noreferrer" key={`${source.sourceName}-${source.title}`}>
              <div><h3>{source.title} <ExternalLink size={12} style={{ display: "inline" }} /></h3><p>{source.sourceName} · osservato il {formatDate(source.observedAt)} · somiglianza {source.similarity}%</p></div>
              <div className="source-price"><strong>{source.price === null ? "n.d." : formatCurrency(source.price)}</strong><span>{source.priceType === "asking" ? "prezzo richiesto" : source.priceType === "sold" ? "venduto" : "non verificato"}</span></div>
            </a>
          ))}</div>
          <p className="field-hint" style={{ marginTop: 12 }}>I prezzi richiesti non dimostrano il prezzo finale di vendita. Gli outlier e le valute diverse da EUR non entrano nella stima.</p>
        </section>

        <section className="report-section">
          <h2>Condizioni osservate</h2>
          <ul className="check-list">{report.identification.observedCondition.map((condition) => <li key={condition}><Check size={17} color="var(--success)" /> {condition}</li>)}</ul>
        </section>
      </div>

      <aside style={{ display: "grid", gap: 16 }}>
        <section className="report-section" style={{ marginTop: 0 }}>
          <h2>Prima di comprare</h2>
          <div className="risk-list">{report.nextChecks.map((check) => <div className="risk" key={check} style={{ borderColor: "var(--lime)", background: "#f5ffd8" }}>{check}</div>)}</div>
        </section>
        <section className="report-section" style={{ marginTop: 0 }}>
          <h2>Rischi e limiti</h2>
          <div className="risk-list">{report.risks.map((risk) => <div className="risk" key={risk}><AlertTriangle size={15} style={{ marginRight: 7, display: "inline" }} />{risk}</div>)}</div>
        </section>
        <Notice tone="warning"><ShieldQuestion size={18} /><span>{report.disclaimer}</span></Notice>
        {itemId ? <ConvertToShopButton itemId={itemId} /> : <Link href="/app/items/new?from=hunt" className="button button-lime button-wide">Trasforma in annuncio <ArrowRight size={18} /></Link>}
        <Link href="/app/hunt/new" className="button button-ghost button-wide">Analizza un altro oggetto</Link>
      </aside>
    </div>
  );
}
