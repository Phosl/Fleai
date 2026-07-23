import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, FileText, ImageIcon, Search, Sparkles } from "lucide-react";
import { Notice } from "@/components/notice";
import { StartItemRunButton } from "@/components/start-item-run-button";
import { isAiRunActive } from "@/lib/ai/run-state";
import { getWorkspaceItemDetail, type WorkspaceItemDetail } from "@/lib/data/workspace-item";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  aiRunKindLabel,
  aiRunStatusLabel,
  categoryLabel,
  itemStatusLabel,
  mediaAssetKindLabel,
  moderationLabel,
} from "@/lib/items/labels";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getWorkspaceItemDetail(id);
  if (result.error) {
    return <div className="workspace-item-feedback"><Notice tone="warning">{result.error}</Notice><Link className="button button-ghost" href="/app/shop">Torna al mio shop</Link></div>;
  }
  if (!result.detail) notFound();
  return <WorkspaceItem detail={result.detail} />;
}

function WorkspaceItem({ detail }: { detail: WorkspaceItemDetail }) {
  const { item, media, report, reportInvalid, runs, publicHref, inquiryCount } = detail;
  const activeRun = runs.find((run) => isAiRunActive(run));
  const activeListingRun = runs.find((run) => run.kind === "listing_draft" && isAiRunActive(run));
  const activeHuntingRun = runs.find((run) => run.kind === "hunting_report" && isAiRunActive(run));
  const listingReady = item.status !== "draft"
    || runs.some((run) => run.kind === "listing_draft" && run.status === "completed")
    || Boolean(item.description && item.price_cents);
  const visibleMedia = media.filter((asset) => asset.url).slice(0, 6);
  const attributes = item.attributes && typeof item.attributes === "object" && !Array.isArray(item.attributes)
    ? Object.entries(item.attributes).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]))
    : [];

  return (
    <>
      <Link className="workspace-item-back" href="/app/shop"><ArrowLeft size={16} /> Torna al mio shop</Link>
      <div className="page-head workspace-item-head">
        <div>
          <span className="eyebrow">{categoryLabel[item.category]} · Scheda oggetto</span>
          <h1 className="title">{item.title || "OGGETTO IN LAVORAZIONE"}.</h1>
          <p>Controlla l’oggetto e scegli tu la prossima azione.</p>
        </div>
        <div className="workspace-item-statuses">
          <span className={`status-pill ${item.status === "published" ? "status-live" : item.status === "reserved" ? "status-reserved" : ""}`}>{itemStatusLabel[item.status]}</span>
          <span className={`status-pill admin-moderation-${item.moderation_status}`}>{moderationLabel[item.moderation_status]}</span>
        </div>
      </div>

      <div className="workspace-item-layout">
        <div className="workspace-item-main">
          <section className="panel">
            <div className="panel-head"><h2>Foto dell’oggetto</h2><span>{visibleMedia.length}</span></div>
            {visibleMedia.length ? <div className="workspace-item-gallery">{visibleMedia.map((asset, index) => (
              <figure className={index === 0 ? "workspace-item-hero-media" : undefined} key={asset.id}>
                <Image src={asset.url} alt={asset.alt_text || item.title} fill sizes={index === 0 ? "(max-width: 720px) 100vw, 60vw" : "(max-width: 720px) 46vw, 240px"} unoptimized />
                <span className={`workspace-media-label ${asset.ai_generated ? "workspace-media-label-ai" : ""}`}>{asset.ai_generated ? "Visualizzazione AI" : mediaAssetKindLabel[asset.kind]}</span>
              </figure>
            ))}</div> : <div className="workspace-item-empty-media"><ImageIcon size={30} /><strong>Nessuna foto disponibile</strong><span>Puoi consultare la scheda; le elaborazioni che richiedono immagini ti chiederanno nuove foto.</span></div>}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Informazioni</h2><span>Aggiornato {formatDate(item.updated_at)}</span></div>
            <dl className="workspace-item-facts">
              <div><dt>Categoria</dt><dd>{categoryLabel[item.category]}</dd></div>
              <div><dt>Marca</dt><dd>{item.brand || "Non indicata"}</dd></div>
              <div><dt>Condizioni</dt><dd>{item.condition || "Da verificare"}</dd></div>
              <div><dt>Prezzo annuncio</dt><dd>{item.price_cents === null ? "Da definire" : formatCurrency(item.price_cents / 100)}</dd></div>
            </dl>
            {item.description && <div className="workspace-item-description"><h3>Descrizione</h3><p>{item.description}</p></div>}
            <div className="workspace-item-description"><h3>Difetti dichiarati</h3>{item.defects.length ? <ul>{item.defects.map((defect) => <li key={defect}>{defect}</li>)}</ul> : <p>Nessun difetto ancora dichiarato.</p>}</div>
            {attributes.length > 0 && <div className="workspace-item-attributes">{attributes.map(([key, value]) => <span key={key}><strong>{key}</strong>{value}</span>)}</div>}
          </section>

          {report && <section className="workspace-report-card"><div><span className="eyebrow">Report Hunting · affidabilità {report.confidenceScore}/100</span><h3>{report.report.identification.label}</h3><p>Valutazione privata: costi e margini non compaiono nello shop pubblico.</p></div><div className="workspace-report-price"><span>Stima probabile</span><strong>{formatCurrency(report.report.resaleLikely)}</strong><Link href={`/app/hunt/${report.id}`}>Apri report</Link></div></section>}
          {reportInvalid && <Notice tone="warning">Il report salvato non è compatibile con il formato corrente. Puoi rigenerarlo dalla sezione azioni.</Notice>}

          <section className="panel">
            <div className="panel-head"><h2>Cronologia AI</h2><span>{runs.length}</span></div>
            {runs.length ? <div className="item-run-list">{runs.slice(0, 6).map((run) => (
              <div key={run.id}><span><strong>{aiRunKindLabel[run.kind]}</strong><small>{formatDate(run.created_at)}</small></span><span className={`status-pill ${run.status === "completed" ? "status-live" : run.status === "failed" ? "admin-status-blocked" : ""}`}>{aiRunStatusLabel[run.status]}</span></div>
            ))}</div> : <p className="muted">Nessuna lavorazione avviata.</p>}
          </section>
        </div>

        <aside className="workspace-item-actions">
          <section className="form-card">
            <span className="eyebrow">Azioni</span>
            <h2>Cosa vuoi fare?</h2>
            <p>Aprire questa pagina non avvia ricerche o generazioni.</p>
            <div className="workspace-action-list">
              {activeRun && <Link className="button button-coral button-wide" href={`/app/runs/${activeRun.id}`}><Sparkles size={17} /> Segui la lavorazione <ArrowRight size={17} /></Link>}
              {listingReady && <Link className="button button-lime button-wide" href={`/app/items/new?item=${item.id}`}><FileText size={17} /> Apri scheda annuncio <ArrowRight size={17} /></Link>}
              {!listingReady && report && !activeListingRun && <StartItemRunButton itemId={item.id} kind="listing_draft" label="Crea scheda annuncio" busyLabel="Creo la bozza…" />}
              {!report && !activeHuntingRun && <StartItemRunButton itemId={item.id} kind="hunting_report" label="Avvia ricerca e valutazione" busyLabel="Avvio ricerca…" className="button button-coral button-wide" />}
              {report && <Link className="button button-ghost button-wide" href={`/app/hunt/${report.id}`}><Search size={17} /> Apri report Hunting</Link>}
              {publicHref && <Link className="button button-ghost button-wide" href={publicHref} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Apri annuncio pubblico</Link>}
              {inquiryCount > 0 && <Link className="button button-ghost button-wide" href="/app/inquiries">Gestisci {inquiryCount} richieste</Link>}
            </div>
          </section>

          <section className="panel workspace-item-private-card">
            <div className="workspace-private-row"><Search size={16} /><span><strong>Prezzo richiesto</strong>{item.asking_price_cents === null ? "Non indicato" : formatCurrency(item.asking_price_cents / 100)}</span></div>
            <div className="workspace-private-row"><FileText size={16} /><span><strong>Costi aggiuntivi</strong>{formatCurrency(item.extra_costs_cents / 100)}</span></div>
            <small>Questi dati e il report Hunting restano privati.</small>
          </section>

          {!report && !reportInvalid && <Notice>Nessun report completato: decidi tu se avviare la ricerca dall’azione qui sopra.</Notice>}
        </aside>
      </div>
    </>
  );
}
