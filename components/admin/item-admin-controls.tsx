"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminMutation } from "@/lib/api/admin-mutation-client";
import type { ItemCategory, ItemStatus, ModerationStatus } from "@/lib/contracts";
import { itemCategoryOptions } from "@/lib/items/labels";

type AdminItem = {
  title: string;
  description: string;
  category: ItemCategory;
  brand: string | null;
  condition: string | null;
  defects: string[];
  price_cents: number | null;
  asking_price_cents: number | null;
  extra_costs_cents: number;
  status: ItemStatus;
  moderation_status: ModerationStatus;
};

type SelectableMedia = { id: string; label: string; kind: string; ai: boolean; approved: boolean };

function nullableMoney(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value === "" ? null : Number(value);
}

export function ItemAdminControls({ itemId, item, media }: { itemId: string; item: AdminItem; media: SelectableMedia[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function run(name: string, url: string, method: "PATCH" | "POST", body: unknown, success: string) {
    setPending(name);
    setFeedback(null);
    try {
      const result = await adminMutation(url, method, body);
      setFeedback({ tone: result.warning ? "error" : "success", text: result.warning ?? success });
      router.refresh();
    } catch (cause) {
      setFeedback({ tone: "error", text: cause instanceof Error ? cause.message : "Operazione non completata." });
    } finally { setPending(null); }
  }

  function updateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    return run("update", `/api/admin/items/${itemId}`, "PATCH", {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      category: data.get("category"),
      brand: String(data.get("brand") ?? "").trim() || null,
      condition: String(data.get("condition") ?? "").trim() || null,
      defects: String(data.get("defects") ?? "").split("\n").map((value) => value.trim()).filter(Boolean),
      price: nullableMoney(data, "price"),
      askingPrice: nullableMoney(data, "askingPrice"),
      extraCosts: Number(data.get("extraCosts") ?? 0),
      reason: String(data.get("reason") ?? ""),
    }, "Scheda aggiornata.");
  }

  function moderate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const decision = String(data.get("decision") ?? "pending") as ModerationStatus;
    if (decision === "blocked" && !window.confirm("Bloccare e archiviare questo oggetto? Le copie media pubbliche verranno rimosse.")) return;
    return run("moderation", `/api/admin/items/${itemId}/moderation`, "POST", {
      decision,
      reason: String(data.get("reason") ?? ""),
    }, `Moderazione impostata su ${decision}.`);
  }

  function transition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = String(data.get("status") ?? "draft") as ItemStatus;
    return run("transition", `/api/admin/items/${itemId}/transition`, "POST", {
      status,
      approvedMediaIds: data.getAll("approvedMediaIds"),
      reason: String(data.get("reason") ?? ""),
    }, `Stato aggiornato a ${status}.`);
  }

  return (
    <div className="admin-control-stack">
      {feedback && <p className={`admin-feedback admin-feedback-${feedback.tone}`} role="status" aria-live="polite">{feedback.text}</p>}
      <form className="form-card" onSubmit={updateItem}>
        <h2>Modifica scheda</h2><p>I dati economici Hunting restano privati.</p>
        <div className="field-grid">
          <div className="field field-full"><label htmlFor="admin-item-title">Titolo</label><input id="admin-item-title" name="title" className="input" defaultValue={item.title} required /></div>
          <div className="field field-full"><label htmlFor="admin-item-description">Descrizione</label><textarea id="admin-item-description" name="description" className="textarea" defaultValue={item.description} /></div>
          <div className="field"><label htmlFor="admin-item-category">Categoria</label><select id="admin-item-category" name="category" className="select" defaultValue={item.category}>{itemCategoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
          <div className="field"><label htmlFor="admin-item-brand">Marca</label><input id="admin-item-brand" name="brand" className="input" defaultValue={item.brand ?? ""} /></div>
          <div className="field field-full"><label htmlFor="admin-item-condition">Condizioni</label><input id="admin-item-condition" name="condition" className="input" defaultValue={item.condition ?? ""} /></div>
          <div className="field field-full"><label htmlFor="admin-item-defects">Difetti, uno per riga</label><textarea id="admin-item-defects" name="defects" className="textarea" defaultValue={item.defects.join("\n")} /></div>
          <div className="field"><label htmlFor="admin-item-price">Prezzo vendita €</label><input id="admin-item-price" name="price" className="input" type="number" step="0.01" min="0" defaultValue={item.price_cents === null ? "" : item.price_cents / 100} /></div>
          <div className="field"><label htmlFor="admin-item-asking">Prezzo richiesto €</label><input id="admin-item-asking" name="askingPrice" className="input" type="number" step="0.01" min="0" defaultValue={item.asking_price_cents === null ? "" : item.asking_price_cents / 100} /></div>
          <div className="field"><label htmlFor="admin-item-costs">Costi extra €</label><input id="admin-item-costs" name="extraCosts" className="input" type="number" step="0.01" min="0" defaultValue={item.extra_costs_cents / 100} /></div>
          <div className="field field-full"><label htmlFor="admin-item-update-reason">Motivazione</label><input id="admin-item-update-reason" name="reason" className="input" minLength={3} maxLength={500} required /></div>
        </div>
        <button className="button button-coral" disabled={pending !== null}>{pending === "update" ? "Salvataggio…" : "Salva scheda"}</button>
      </form>

      <form className="form-card" onSubmit={moderate}>
        <h2>Moderazione</h2><p>Approvare non pubblica automaticamente. Bloccare archivia e rimuove le copie pubbliche.</p>
        <div className="field-grid">
          <div className="field"><label htmlFor="admin-moderation">Decisione</label><select id="admin-moderation" name="decision" className="select" defaultValue={item.moderation_status}><option value="pending">In revisione</option><option value="approved">Approvato</option><option value="blocked">Bloccato</option></select></div>
          <div className="field field-full"><label htmlFor="admin-moderation-reason">Motivazione</label><textarea id="admin-moderation-reason" name="reason" className="textarea" minLength={3} maxLength={500} required /></div>
        </div>
        <button className="button button-ghost" disabled={pending !== null}>{pending === "moderation" ? "Aggiornamento…" : "Applica moderazione"}</button>
      </form>

      <form className="form-card" onSubmit={transition}>
        <h2>Stato commerciale</h2><p>Per pubblicare seleziona almeno una foto reale e completa prima la scheda.</p>
        <div className="field-grid">
          <div className="field"><label htmlFor="admin-transition">Nuovo stato</label><select id="admin-transition" name="status" className="select" defaultValue={item.status}><option value="draft">Bozza</option><option value="published">Pubblicato</option><option value="reserved">Riservato</option><option value="sold">Venduto</option><option value="archived">Archiviato</option></select></div>
          <fieldset className="field field-full admin-media-checks"><legend className="field-label">Media per la pubblicazione</legend>{media.length ? media.map((asset) => <label key={asset.id} className="confirm-row"><input type="checkbox" name="approvedMediaIds" value={asset.id} defaultChecked={asset.approved || asset.kind === "real"} /><span>{asset.label || asset.kind} · {asset.ai ? "AI" : "reale"}</span></label>) : <span className="muted">Nessun media privato disponibile.</span>}</fieldset>
          <div className="field field-full"><label htmlFor="admin-transition-reason">Motivazione</label><textarea id="admin-transition-reason" name="reason" className="textarea" minLength={3} maxLength={500} required /></div>
        </div>
        <button className="button button-lime" disabled={pending !== null}>{pending === "transition" ? "Aggiornamento…" : "Cambia stato"}</button>
      </form>
    </div>
  );
}
