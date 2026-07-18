"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Check, Download, ImageIcon, Shirt, Sparkles, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Notice } from "@/components/notice";
import { AI_GENERATED_LABEL } from "@/lib/contracts";
import { demoListing } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/env/public";
import { formatCurrency } from "@/lib/format";
import type { CreateAiRunInput, ListingDraftDTO } from "@/lib/contracts";
import { startAiRun } from "@/lib/api/ai-runs-client";

const demoMedia = [
  { id: "demo-real", src: "/demo-chair.svg", label: "Foto reale", ai: false },
  { id: "demo-clean", src: "/demo-chair-clean.svg", label: "Hero pulita", ai: true },
  { id: "demo-context", src: "/demo-chair-context.svg", label: "Contesto", ai: true },
  { id: "demo-social", src: "/demo-chair-social.svg", label: "Social 9:16", ai: true },
];

type Tab = "listing" | "vinted" | "visual" | "social";

type StudioMedia = { id: string; src: string; label: string; ai: boolean; kind?: string };

export function ShopStudio({ itemId, initialListing = demoListing, initialMedia = demoMedia }: { itemId?: string; initialListing?: ListingDraftDTO; initialMedia?: StudioMedia[] }) {
  const router = useRouter();
  const media: StudioMedia[] = initialMedia.length ? initialMedia : demoMedia;
  const [tab, setTab] = useState<Tab>("listing");
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [listing, setListing] = useState(initialListing);
  const [approvedMediaIds, setApprovedMediaIds] = useState(() => media.map((asset) => asset.id));
  const [generationError, setGenerationError] = useState("");
  const [tryOn, setTryOn] = useState<NonNullable<CreateAiRunInput["input"]["tryOn"]>>({ presentation: "woman", ageRange: "30-44", heightCm: 170, weightKg: 65 });

  async function publish() {
    if (!confirmed) return;
    setPublishing(true);
    if (isSupabaseConfigured && itemId) {
      const response = await fetch(`/api/items/${itemId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ title: listing.title, description: listing.description, condition: listing.condition, defects: listing.defects, price: listing.price, approvedMediaIds, confirmation: true }),
      });
      if (!response.ok) { setPublishing(false); return; }
      const published = await response.json() as { slug: string; shopSlug: string };
      router.push(`/s/${published.shopSlug}/${published.slug}?published=1`);
      return;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    router.push("/s/officina-ritrovata/sedia-cesca-vintage?published=1");
  }

  async function startGeneration(kind: "marketing_images" | "social_pack") {
    if (!itemId) return;
    setGenerationError("");
    try {
      const { runId } = await startAiRun({ itemId, kind, runInput: kind === "marketing_images" && listing.category === "fashion" ? { tryOn } : {} });
      router.push(`/app/runs/${runId}`);
    } catch (cause) {
      setGenerationError(cause instanceof Error ? cause.message : "Generazione non disponibile. Riprova tra poco.");
    }
  }

  return (
    <div className="studio-grid">
      <section className="studio-media">
        <div className="studio-main-image">
          <Image src={media[selectedMedia].src} alt={media[selectedMedia].label} fill sizes="(max-width: 980px) 100vw, 38vw" priority loading="eager" />
          {media[selectedMedia].ai && <span className="ai-badge">{AI_GENERATED_LABEL}</span>}
        </div>
        <div className="studio-thumbs">{media.map((asset, index) => <div key={asset.id}><button className={`studio-thumb ${selectedMedia === index ? "studio-thumb-active" : ""}`} type="button" onClick={() => setSelectedMedia(index)} aria-label={`Mostra ${asset.label}`}><Image src={asset.src} alt="" width={120} height={120} /></button>{itemId && <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, marginTop: 4 }}><input type="checkbox" checked={approvedMediaIds.includes(asset.id)} onChange={(event) => setApprovedMediaIds(event.target.checked ? [...approvedMediaIds, asset.id] : approvedMediaIds.filter((id) => id !== asset.id))} /> Pubblica</label>}</div>)}</div>
        <Notice tone="warning"><span><strong>Foto reali sempre disponibili.</strong><br />Gli asset AI aiutano a presentare l’oggetto, ma non documentano condizioni o autenticità.</span></Notice>
      </section>

      <section className="form-card">
        <div className="tabs" role="tablist" aria-label="Editor annuncio">
          <button className={`tab ${tab === "listing" ? "tab-active" : ""}`} onClick={() => setTab("listing")} type="button" role="tab"><Check size={14} style={{ display: "inline", marginRight: 5 }} />Scheda</button>
          <button className={`tab ${tab === "vinted" ? "tab-active" : ""}`} onClick={() => setTab("vinted")} type="button" role="tab">Vinted</button>
          <button className={`tab ${tab === "visual" ? "tab-active" : ""}`} onClick={() => setTab("visual")} type="button" role="tab"><ImageIcon size={14} style={{ display: "inline", marginRight: 5 }} />Visual</button>
          <button className={`tab ${tab === "social" ? "tab-active" : ""}`} onClick={() => setTab("social")} type="button" role="tab"><Sparkles size={14} style={{ display: "inline", marginRight: 5 }} />Social</button>
        </div>

        {tab === "listing" && <div className="field-grid">
          <div className="field field-full"><label htmlFor="title">Titolo</label><input id="title" className="input" value={listing.title} onChange={(e) => setListing({ ...listing, title: e.target.value })} maxLength={100} /></div>
          <div className="field"><label htmlFor="category-shop">Categoria</label><select id="category-shop" className="select" value={listing.category} onChange={(e) => setListing({ ...listing, category: e.target.value as typeof listing.category })}><option value="fashion">Moda e accessori</option><option value="home_design">Casa e design</option><option value="collectibles">Collezionabili</option></select></div>
          <div className="field"><label htmlFor="price-shop">Prezzo</label><div style={{ position: "relative" }}><span style={{ position: "absolute", top: 13, left: 14 }}>€</span><input id="price-shop" className="input" style={{ paddingLeft: 35 }} type="number" value={listing.price} onChange={(e) => setListing({ ...listing, price: Number(e.target.value) })} /></div></div>
          <div className="field field-full"><label htmlFor="condition-shop">Condizioni reali</label><input id="condition-shop" className="input" value={listing.condition} onChange={(e) => setListing({ ...listing, condition: e.target.value })} /></div>
          <div className="field field-full"><label htmlFor="description-shop">Descrizione</label><textarea id="description-shop" className="textarea" style={{ minHeight: 180 }} value={listing.description} onChange={(e) => setListing({ ...listing, description: e.target.value })} /></div>
          <div className="field field-full"><label htmlFor="defects-shop">Difetti dichiarati</label><textarea id="defects-shop" className="textarea" value={listing.defects.join("\n")} onChange={(event) => setListing({ ...listing, defects: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 12) })} /><span className="field-hint">Un difetto per riga. Non omettere ciò che è visibile nelle foto reali.</span></div>
        </div>}

        {tab === "vinted" && <div style={{ display: "grid", gap: 16 }}>
          <div className="field"><span className="field-label">Titolo Vinted</span><div className="copy-field">{listing.vintedTitle}<CopyButton value={listing.vintedTitle} label="Copia titolo Vinted" /></div></div>
          <div className="field"><span className="field-label">Descrizione Vinted</span><div className="copy-field">{listing.vintedDescription}<CopyButton value={listing.vintedDescription} label="Copia descrizione Vinted" /></div></div>
          <div className="price-row"><div className="price-box"><span>Prezzo consigliato</span><strong>{formatCurrency(listing.price)}</strong></div><div className="price-box"><span>Condizioni</span><strong style={{ fontSize: 15 }}>{listing.condition}</strong></div><div className="price-box"><span>Categoria</span><strong style={{ fontSize: 15 }}>Casa</strong></div></div>
          <Notice>Fleai non pubblica su Vinted: controlla la tassonomia e le regole del marketplace prima di copiare la scheda.</Notice>
        </div>}

        {tab === "visual" && <div style={{ display: "grid", gap: 14 }}>
          <div className="quick-action"><span className="quick-action-icon"><ImageIcon size={20} /></span><span><strong>Hero su fondo neutro</strong><small className="muted" style={{ display: "block" }}>{media.some((asset) => asset.kind === "clean_ai" || asset.id === "demo-clean") ? "Pronta · 1024×1280" : "Da generare"}</small></span>{media.some((asset) => asset.kind === "clean_ai" || asset.id === "demo-clean") && <Check size={18} style={{ marginLeft: "auto", color: "var(--success)" }} />}</div>
          <div className="quick-action"><span className="quick-action-icon" style={{ background: "var(--coral)", color: "var(--ink)" }}><Sparkles size={20} /></span><span><strong>Oggetto contestualizzato</strong><small className="muted" style={{ display: "block" }}>{media.some((asset) => asset.kind === "context_ai" || asset.id === "demo-context") ? "Pronta · watermark incluso" : "Da generare"}</small></span>{media.some((asset) => asset.kind === "context_ai" || asset.id === "demo-context") && <Check size={18} style={{ marginLeft: "auto", color: "var(--success)" }} />}</div>
          <div className="quick-action"><span className="quick-action-icon" style={{ background: "var(--violet)", color: "var(--ink)" }}><Shirt size={20} /></span><span><strong>Virtual try-on</strong><small className="muted" style={{ display: "block" }}>Disponibile solo per moda</small></span></div>
          {listing.category === "fashion" && itemId && <div className="field-grid" style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 12 }}>
            <div className="field"><label htmlFor="try-presentation">Presentazione</label><select id="try-presentation" className="select" value={tryOn.presentation} onChange={(event) => setTryOn({ ...tryOn, presentation: event.target.value as typeof tryOn.presentation })}><option value="woman">Donna</option><option value="man">Uomo</option><option value="neutral">Neutra</option></select></div>
            <div className="field"><label htmlFor="try-age">Fascia d’età</label><select id="try-age" className="select" value={tryOn.ageRange} onChange={(event) => setTryOn({ ...tryOn, ageRange: event.target.value as typeof tryOn.ageRange })}><option>18-29</option><option>30-44</option><option>45-60</option><option>60+</option></select></div>
            <div className="field"><label htmlFor="try-height">Altezza cm</label><input id="try-height" className="input" type="number" min="140" max="210" value={tryOn.heightCm} onChange={(event) => setTryOn({ ...tryOn, heightCm: Number(event.target.value) })} /></div>
            <div className="field"><label htmlFor="try-weight">Peso kg</label><input id="try-weight" className="input" type="number" min="40" max="180" value={tryOn.weightKg} onChange={(event) => setTryOn({ ...tryOn, weightKg: Number(event.target.value) })} /></div>
            <p className="field-hint field-full">Il modello è adulto e sintetico. Vestibilità e proporzioni sono indicative.</p>
          </div>}
          {itemId && <button className="button button-coral" type="button" onClick={() => void startGeneration("marketing_images")}><Sparkles size={17} /> Genera o rigenera visual</button>}
          <a className="button button-ghost" href={media[selectedMedia].src} download><Download size={17} /> Scarica visual selezionato</a>
        </div>}

        {tab === "social" && <div style={{ display: "grid", gap: 16 }}>
          <div className="field"><span className="field-label">Caption Instagram</span><div className="copy-field">{listing.instagramCaption}<CopyButton value={listing.instagramCaption} label="Copia caption Instagram" /></div></div>
          <div className="field"><span className="field-label">Caption TikTok</span><div className="copy-field">{listing.tiktokCaption}<CopyButton value={listing.tiktokCaption} label="Copia caption TikTok" /></div></div>
          <div className="field"><span className="field-label">Hashtag</span><div className="copy-field">{listing.hashtags.join(" ")}<CopyButton value={listing.hashtags.join(" ")} label="Copia hashtag" /></div></div>
          <div className="quick-action"><span className="quick-action-icon"><Video size={20} /></span><span><strong>Slideshow verticale · 10s</strong><small className="muted" style={{ display: "block" }}>1080×1920 · senza audio</small></span>{media.find((asset) => asset.kind === "social_video") && <a className="button button-sm button-ghost" href={media.find((asset) => asset.kind === "social_video")?.src} download><Download size={15} /> MP4</a>}</div>
          {itemId && <button className="button button-coral" type="button" onClick={() => void startGeneration("social_pack")}><Video size={17} /> Genera slideshow</button>}
        </div>}

        {generationError && <p role="alert" style={{ color: "var(--danger)", fontSize: 12 }}>{generationError}</p>}
        <label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>Confermo che descrizione, condizioni, difetti, prezzo e foto reali corrispondono all’oggetto. So che le visualizzazioni AI sono indicative.</span></label>
        <button className="button button-coral button-wide" type="button" disabled={!confirmed || publishing || (Boolean(itemId) && approvedMediaIds.length === 0)} onClick={() => void publish()}>{publishing ? <><span className="spinner" /> Pubblicazione…</> : <>Pubblica nello shop Fleai <ArrowRight size={18} /></>}</button>
      </section>
    </div>
  );
}
