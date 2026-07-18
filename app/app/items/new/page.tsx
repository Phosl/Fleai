import { ShopStudio } from "@/components/shop-studio";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { listingDraftSchema } from "@/lib/contracts";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Camera, ArrowRight } from "lucide-react";

export default async function NewShopItemPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item: itemId } = await searchParams;
  if (isDemoMode) {
    return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">PRONTO A VENDERE.</h1><p>Controlla la scheda, approva i visual e pubblica la tua vetrina.</p></div><span className="status-pill status-live">Bozza AI pronta</span></div><ShopStudio /></>;
  }
  if (!itemId) return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">NUOVO OGGETTO.</h1><p>La prima analisi verifica identità, condizioni e rischi; poi riutilizziamo tutto per creare la scheda.</p></div></div><section className="panel" style={{ maxWidth: 700 }}><span className="quick-action-icon"><Camera size={22} /></span><h2>Parti da 1–3 foto reali</h2><p className="muted">Le foto delle condizioni restano sempre separate dai visual AI. Dopo il report potrai generare scheda Vinted, scena, try-on e social pack.</p><Link className="button button-coral" href="/app/hunt/new">Fotografa l’oggetto <ArrowRight size={17} /></Link></section></>;
  const supabase = await createClient();
  const [{ data: item }, { data: listingRun }, { data: assets }] = await Promise.all([
    supabase.from("items").select("id").eq("id", itemId).maybeSingle(),
    supabase.from("analysis_runs").select("result").eq("item_id", itemId).eq("kind", "listing_draft").eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("media_assets").select("id,bucket_id,storage_path,alt_text,ai_generated,kind").eq("item_id", itemId).eq("bucket_id", "item-media-private").order("sort_order"),
  ]);
  if (!item || !listingRun?.result) notFound();
  const listing = listingDraftSchema.safeParse(listingRun.result);
  if (!listing.success) notFound();
  const media = await Promise.all((assets ?? []).map(async (asset) => {
    const { data } = await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 60 * 60);
    return { id: asset.id, src: data?.signedUrl ?? "", label: asset.alt_text, ai: asset.ai_generated, kind: asset.kind };
  }));
  return <><div className="page-head"><div><span className="eyebrow">Flea Market Shop</span><h1 className="title">PRONTO A VENDERE.</h1><p>Controlla dati reali, difetti, prezzo e media prima di pubblicare.</p></div><span className="status-pill status-live">Bozza AI pronta</span></div><ShopStudio itemId={itemId} initialListing={listing.data} initialMedia={media.filter((asset) => asset.src)} /></>;
}
