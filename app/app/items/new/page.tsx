import { ShopStudio } from "@/components/shop-studio";
import { ConvertToShopButton } from "@/components/convert-to-shop-button";
import { StartItemRunButton } from "@/components/start-item-run-button";
import { Notice } from "@/components/notice";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { listingDraftSchema } from "@/lib/contracts";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Camera, ArrowRight, RotateCcw } from "lucide-react";
import { isAiRunActive, isAiRunStalled } from "@/lib/ai/run-state";

export default async function NewShopItemPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item: itemId } = await searchParams;
  if (isDemoMode) {
    return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">PRONTO A VENDERE.</h1><p>Controlla la scheda, approva i visual e pubblica la tua vetrina.</p></div><span className="status-pill status-live">Bozza AI pronta</span></div><ShopStudio /></>;
  }
  if (!itemId) return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">NUOVO OGGETTO.</h1><p>La prima analisi verifica identità, condizioni e rischi; poi riutilizziamo tutto per creare la scheda.</p></div></div><section className="panel" style={{ maxWidth: 700 }}><span className="quick-action-icon"><Camera size={22} /></span><h2>Parti da 1–3 foto reali</h2><p className="muted">Le foto delle condizioni restano sempre separate dai visual AI. Dopo il report potrai generare scheda Vinted, scena, try-on e social pack.</p><Link className="button button-coral" href="/app/hunt/new">Fotografa l’oggetto <ArrowRight size={17} /></Link></section></>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: item }, { data: runs }, { data: assets }] = await Promise.all([
    supabase.from("items").select("id,selected_report_id").eq("id", itemId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("analysis_runs").select("id,kind,status,result,error_code,attempt_count,created_at,updated_at").eq("item_id", itemId).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("media_assets").select("id,bucket_id,storage_path,alt_text,ai_generated,kind").eq("item_id", itemId).eq("owner_id", user.id).eq("bucket_id", "item-media-private").order("sort_order"),
  ]);
  if (!item) notFound();
  const listingRun = runs?.find((run) => run.kind === "listing_draft" && run.status === "completed" && run.result);
  if (!listingRun?.result) {
    const activeRun = runs?.find((run) =>
      (run.kind === "hunting_report" || run.kind === "listing_draft") && isAiRunActive(run)
    );
    const failedRun = runs?.find((run) => (
      run.kind === "hunting_report" || run.kind === "listing_draft"
    ) && (
      run.status === "failed" || run.status === "needs_input" || isAiRunStalled(run)
    ));
    const realPhotoCount = assets?.filter((asset) => asset.kind === "real").length ?? 0;
    return (
      <ShopDraftUnavailable
        itemId={itemId}
        reportId={item.selected_report_id}
        activeRun={activeRun ? {
          id: activeRun.id,
          kind: activeRun.kind === "hunting_report" ? "hunting_report" : "listing_draft",
        } : undefined}
        failedRunKind={failedRun
          ? failedRun.kind === "hunting_report" ? "hunting_report" : "listing_draft"
          : undefined}
        realPhotoCount={realPhotoCount}
      />
    );
  }
  const listing = listingDraftSchema.safeParse(listingRun.result);
  if (!listing.success) {
    return (
      <ShopDraftUnavailable
        itemId={itemId}
        reportId={item.selected_report_id}
        failedRunKind="listing_draft"
        realPhotoCount={assets?.filter((asset) => asset.kind === "real").length ?? 0}
        invalid
      />
    );
  }
  const media = await Promise.all((assets ?? []).map(async (asset) => {
    const { data } = await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 60 * 60);
    return { id: asset.id, src: data?.signedUrl ?? "", label: asset.alt_text, ai: asset.ai_generated, kind: asset.kind };
  }));
  return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">PRONTO A VENDERE.</h1><p>Controlla dati reali, difetti, prezzo e media prima di pubblicare.</p></div><span className="status-pill status-live">Bozza AI pronta</span></div><ShopStudio itemId={itemId} initialListing={listing.data} initialMedia={media.filter((asset) => asset.src)} /></>;
}

function ShopDraftUnavailable({
  itemId,
  reportId,
  activeRun,
  failedRunKind,
  realPhotoCount,
  invalid = false,
}: {
  itemId: string;
  reportId: string | null;
  activeRun?: { id: string; kind: "hunting_report" | "listing_draft" };
  failedRunKind?: "hunting_report" | "listing_draft";
  realPhotoCount: number;
  invalid?: boolean;
}) {
  const hasReport = Boolean(reportId);
  const photoLabel = `${realPhotoCount} ${realPhotoCount === 1 ? "foto reale" : "foto reali"}`;
  const huntingActive = activeRun?.kind === "hunting_report";
  const failed = Boolean(failedRunKind);
  const description = activeRun
    ? huntingActive
      ? `La ricerca è in corso e usa ${photoLabel} già salvate.`
      : "La scheda annuncio è in lavorazione."
    : hasReport
      ? "Il report è disponibile: puoi creare o rigenerare la scheda vendita."
      : realPhotoCount > 0
        ? `Hai già ${photoLabel}: puoi cercare senza caricarle di nuovo.`
        : "Servono foto reali prima di avviare la ricerca.";
  const notice = activeRun
    ? "La lavorazione continua in background. Aprila per vedere lo stato aggiornato."
    : invalid
      ? "La bozza generata non è compatibile con il formato corrente. Rigenerala dal report."
      : failedRunKind === "hunting_report"
        ? `La ricerca precedente non si è conclusa, ma ${photoLabel} sono ancora disponibili. Puoi riprovare da qui.`
        : failedRunKind === "listing_draft"
          ? "La generazione precedente non è stata completata. Puoi riprovare senza perdere foto e report."
          : hasReport
            ? "Il report è pronto, ma non esiste ancora una bozza Shop completata."
            : realPhotoCount > 0
              ? `Fleai riuserà ${photoLabel} private già associate a questo oggetto.`
              : "Aggiungi almeno una foto per continuare.";

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Flea Market Shop</span>
          <h1 className="title">{huntingActive ? "RICERCA IN CORSO." : "SCHEDA OGGETTO."}</h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="panel shop-draft-state">
        <Notice tone={failed || invalid ? "warning" : "info"}>{notice}</Notice>
        <div className="shop-draft-actions">
          {activeRun ? (
            <Link className="button button-coral button-wide" href={`/app/runs/${activeRun.id}`}>
              Segui la lavorazione <ArrowRight size={17} />
            </Link>
          ) : hasReport ? (
            <ConvertToShopButton itemId={itemId} />
          ) : realPhotoCount > 0 ? (
            <StartItemRunButton
              itemId={itemId}
              kind="hunting_report"
              label={`${failedRunKind === "hunting_report" ? "Riprova" : "Cerca"} con ${photoLabel}`}
              busyLabel="Avvio ricerca…"
              className="button button-coral button-wide"
            />
          ) : (
            <Link className="button button-coral button-wide" href="/app/hunt/new">
              <RotateCcw size={17} /> Aggiungi le foto
            </Link>
          )}
          {reportId && (
            <Link className="button button-ghost button-wide" href={`/app/hunt/${reportId}`}>
              Rivedi il report Hunting <ArrowRight size={17} />
            </Link>
          )}
          <Link className="button button-ghost button-wide" href={`/app/items/${itemId}`}>
            Apri la scheda dell’oggetto
          </Link>
        </div>
      </section>
    </>
  );
}
