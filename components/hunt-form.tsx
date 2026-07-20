"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { PhotoCapture } from "@/components/photo-capture";
import { isSupabaseConfigured } from "@/lib/env/public";
import { clearDraftPhotos } from "@/lib/media/normalize-image";
import { createClient } from "@/lib/supabase/client";
import { startAiRun } from "@/lib/api/ai-runs-client";

const DRAFT_KEY = "hunt-new";

const HUNT_FORM_DEFAULTS = {
  category: "home_design",
  itemName: "",
  brand: "",
  searchHint: "",
  askingPrice: "35",
  extraCosts: "10",
  notes: "",
};

export function HuntForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState(HUNT_FORM_DEFAULTS);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const onPhotosChange = useCallback((nextFiles: File[]) => setFiles(nextFiles), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem("fleai:hunt-form");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setForm({
            ...HUNT_FORM_DEFAULTS,
            ...parsed,
            askingPrice: String(parsed.askingPrice ?? HUNT_FORM_DEFAULTS.askingPrice),
            extraCosts: String(parsed.extraCosts ?? HUNT_FORM_DEFAULTS.extraCosts),
          });
        } catch {
          localStorage.removeItem("fleai:hunt-form");
        }
      }
      setDraftHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (draftHydrated) localStorage.setItem("fleai:hunt-form", JSON.stringify(form)); }, [draftHydrated, form]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (files.length === 0) { setError("Aggiungi almeno una foto dell’oggetto."); return; }
    const hasSearchHint = [form.itemName, form.brand, form.searchHint].some((value) => value.trim().length > 0);
    if (!hasSearchHint) {
      setError("Inserisci almeno una tra: nome/modello, marca o descrizione breve per aiutare la ricerca.");
      return;
    }
    setStatus("submitting"); setError("");
    try {
      if (!isSupabaseConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
        await clearDraftPhotos(DRAFT_KEY);
        localStorage.removeItem("fleai:hunt-form");
        router.push("/app/hunt/demo-report");
        return;
      }

      const itemResponse = await fetch("/api/items", {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          category: form.category,
          itemName: form.itemName,
          brand: form.brand,
          searchHint: form.searchHint,
          askingPrice: Number(form.askingPrice),
          extraCosts: Number(form.extraCosts),
          notes: form.notes,
        }),
      });
      if (!itemResponse.ok) throw new Error("Non siamo riusciti a creare il ritrovamento.");
      const { itemId } = await itemResponse.json() as { itemId: string };
      const supabase = createClient();
      for (const file of files) {
        const signedResponse = await fetch("/api/media/sign-upload", {
          method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ itemId, fileName: file.name, mimeType: file.type, byteSize: file.size }),
        });
        if (!signedResponse.ok) throw new Error("Upload non disponibile.");
        const { path, token } = await signedResponse.json() as { path: string; token: string };
        const { error: uploadError } = await supabase.storage.from("item-media-private").uploadToSignedUrl(path, token, file, { contentType: file.type });
        if (uploadError) throw uploadError;
      }
      const { runId } = await startAiRun({
        itemId,
        kind: "hunting_report",
        runInput: {
          itemName: form.itemName,
          brand: form.brand,
          searchHint: form.searchHint,
          askingPrice: Number(form.askingPrice),
          extraCosts: Number(form.extraCosts),
          notes: form.notes,
        },
      });
      await clearDraftPhotos(DRAFT_KEY);
      localStorage.removeItem("fleai:hunt-form");
      router.push(`/app/runs/${runId}`);
    } catch (cause) {
      setStatus("error"); setError(cause instanceof Error ? cause.message : "Qualcosa non ha funzionato.");
    }
  }

  return (
    <form className="form-layout" onSubmit={handleSubmit}>
      <section className="form-card">
        <h2>Fotografa e identifica</h2>
        <p>Fai 1–3 foto e lascia almeno un riferimento oggettivo (nome, marca o descrizione breve). Aiuta molto la ricerca.</p>
        <div className="field-grid">
          <PhotoCapture draftKey={DRAFT_KEY} onChange={onPhotosChange} />
          <div className="field"><label htmlFor="category">Categoria</label><select id="category" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="fashion">Moda e accessori</option><option value="home_design">Casa e design</option><option value="collectibles">Collezionabili</option></select></div>
          <div className="field"><label htmlFor="item-name">Nome o modello</label><input id="item-name" className="input" type="text" value={form.itemName} placeholder="Es. Giubbotto in pelle, tazza campione..." onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div>
          <div className="field"><label htmlFor="brand">Marca</label><input id="brand" className="input" type="text" value={form.brand} placeholder="Es. Levi&apos;s, Polaroid..." onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div className="field field-full"><label htmlFor="search-hint">Descrizione breve <span className="muted">(obbligatoria se manca nome/marca)</span></label><textarea id="search-hint" className="textarea" placeholder="Es. pelle marrone, cuciture gialle, etichetta interna..." value={form.searchHint} onChange={(e) => setForm({ ...form, searchHint: e.target.value })} maxLength={500} /></div>
          <div className="field"><label htmlFor="asking-price">Prezzo richiesto</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: 13 }}>€</span><input id="asking-price" className="input" style={{ paddingLeft: 34 }} type="number" min="0" step="1" inputMode="decimal" value={form.askingPrice} onChange={(e) => setForm({ ...form, askingPrice: e.target.value })} required /></div></div>
          <div className="field"><label htmlFor="extra-costs">Costi extra stimati</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: 13 }}>€</span><input id="extra-costs" className="input" style={{ paddingLeft: 34 }} type="number" min="0" step="1" inputMode="decimal" value={form.extraCosts} onChange={(e) => setForm({ ...form, extraCosts: e.target.value })} /></div><span className="field-hint">Pulizia, riparazione, trasporto</span></div>
          <div className="field field-full"><label htmlFor="notes">Cosa hai notato? <span className="muted">Facoltativo</span></label><textarea id="notes" className="textarea" placeholder="Marchio visibile, misure, difetti, informazioni del venditore…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} /></div>
        </div>
      </section>
      <aside className="form-card sticky-card">
        <h2>Tre foto utili</h2><p>Il report vede soltanto ciò che gli mostri.</p>
        <div className="camera-tips">
          <div className="camera-tip"><span className="camera-tip-number">1</span><span><strong>Oggetto intero</strong><br />Luce uniforme, niente filtri.</span></div>
          <div className="camera-tip"><span className="camera-tip-number">2</span><span><strong>Retro e struttura</strong><br />Mostra materiali e costruzione.</span></div>
          <div className="camera-tip"><span className="camera-tip-number">3</span><span><strong>Marchi e difetti</strong><br />Etichette, firme, seriali e usura.</span></div>
        </div>
        <div className="notice" style={{ margin: "1.2rem 0", fontSize: 12 }}><ShieldCheck size={18} /><span>Le foto restano private finché non approvi un annuncio.</span></div>
        {error && <div className="notice notice-danger" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="button button-coral button-wide" disabled={status === "submitting"}>{status === "submitting" ? <span className="submit-state"><span className="spinner" /> Avvio ricerca…</span> : <>Cerca e valuta <ArrowRight size={18} /></>}</button>
        <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 12, color: "var(--muted)", fontSize: 11 }}><Check size={14} /> Consuma 1 dei 5 report mensili solo se completato.</div>
      </aside>
    </form>
  );
}
