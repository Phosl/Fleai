import { ShopStudio } from "@/components/shop-studio";
import { ConvertToShopButton } from "@/components/convert-to-shop-button";
import { Notice } from "@/components/notice";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { listingDraftSchema } from "@/lib/contracts";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Camera, ArrowRight, RotateCcw } from "lucide-react";

const activeRunStatuses = new Set(["queued", "moderating", "inspecting", "researching", "synthesizing", "generating", "rendering"]);

export default async function NewShopItemPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item: itemId } = await searchParams;
  if (isDemoMode) {
    return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">PRONTO A VENDERE.</h1><p>Controlla la scheda, approva i visual e pubblica la tua vetrina.</p></div><span className="status-pill status-live">Bozza AI pronta</span></div><ShopStudio /></>;
  }
  if (!itemId) return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">NUOVO OGGETTO.</h1><p>La prima analisi verifica identità, condizioni e rischi; poi riutilizziamo tutto per creare la scheda.</p></div></div><section className="panel" style={{ maxWidth: 700 }}><span className="quick-action-icon"><Camera size={22} /></span><h2>Parti da 1–3 foto reali</h2><p className="muted">Le foto delle condizioni restano sempre separate dai visual AI. Dopo il report potrai generare scheda Vinted, scena, try-on e social pack.</p><Link className="button button-coral" href="/app/hunt/new">Fotografa l’oggetto <ArrowRight size={17} /></Link></section></>;
  const supabase = await createClient();
  const [{ data: item }, { data: runs }, { data: assets }] = await Promise.all([
    supabase.from("items").select("id,selected_report_id").eq("id", itemId).maybeSingle(),
    supabase.from("analysis_runs").select("id,kind,status,result,error_code,created_at").eq("item_id", itemId).order("created_at", { ascending: false }).limit(12),
    supabase.from("media_assets").select("id,bucket_id,storage_path,alt_text,ai_generated,kind").eq("item_id", itemId).eq("bucket_id", "item-media-private").order("sort_order"),
  ]);
  if (!item) notFound();
  const activeRun = runs?.find((run) => activeRunStatuses.has(run.status));
  if (activeRun) redirect(`/app/runs/${activeRun.id}`);
  const listingRun = runs?.find((run) => run.kind === "listing_draft" && run.status === "completed" && run.result);
  if (!listingRun?.result) {
    const failedListingRun = runs?.find((run) => run.kind === "listing_draft" && (run.status === "failed" || run.status === "needs_input"));
    return <ShopDraftUnavailable itemId={itemId} reportId={item.selected_report_id} failed={Boolean(failedListingRun)} />;
  }
  const listing = listingDraftSchema.safeParse(listingRun.result);
  if (!listing.success) return <ShopDraftUnavailable itemId={itemId} reportId={item.selected_report_id} failed invalid />;
  const media = await Promise.all((assets ?? []).map(async (asset) => {
    const { data } = await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 60 * 60);
    return { id: asset.id, src: data?.signedUrl ?? "", label: asset.alt_text, ai: asset.ai_generated, kind: asset.kind };
  }));
  return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">PRONTO A VENDERE.</h1><p>Controlla dati reali, difetti, prezzo e media prima di pubblicare.</p></div><span className="status-pill status-live">Bozza AI pronta</span></div><ShopStudio itemId={itemId} initialListing={listing.data} initialMedia={media.filter((asset) => asset.src)} /></>;
}

function ShopDraftUnavailable({ itemId, reportId, failed = false, invalid = false }: { itemId: string; reportId: string | null; failed?: boolean; invalid?: boolean }) {
  const hasReport = Boolean(reportId);
  return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">BOZZA NON PRONTA.</h1><p>{hasReport ? "Il report è disponibile: puoi avviare o rigenerare la scheda vendita." : "L’analisi Hunting deve essere completata prima di creare la scheda vendita."}</p></div></div><section className="panel" style={{ maxWidth: 720 }}><Notice tone={failed || invalid ? "warning" : "info"}>{invalid ? "La bozza generata non è compatibile con il formato corrente. Rigenerala dal report." : failed ? "La generazione precedente non è stata completata. Puoi riprovare senza perdere le foto reali." : "Questo oggetto esiste, ma non ha ancora una bozza Shop completata."}</Notice><div style={{ display: "grid", gap: 12, marginTop: 18 }}>{hasReport && <ConvertToShopButton itemId={itemId} />}{reportId && <Link className="button button-ghost button-wide" href={`/app/hunt/${reportId}`}>Rivedi il report Hunting <ArrowRight size={17} /></Link>}{!hasReport && <Link className="button button-coral button-wide" href="/app/hunt/new"><RotateCcw size={17} /> Avvia una nuova analisi</Link>}</div></section></>;
}
