import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { ItemCard } from "@/components/item-card";
import { demoItems } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

export default async function MyShopPage() {
  if (isDemoMode) return <ShopContent items={demoItems.map((item) => ({ ...item }))} shopHref="/s/officina-ritrovata" />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <ShopContent items={[]} />;
  const [{ data: items }, { data: shop }] = await Promise.all([
    supabase.from("items").select("id,slug,title,price_cents,category,status").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("shops").select("slug,is_published").eq("owner_id", user.id).maybeSingle(),
  ]);
  const ids = (items ?? []).map((item) => item.id);
  const { data: assets } = ids.length ? await supabase.from("media_assets").select("item_id,bucket_id,storage_path,ai_generated,sort_order").eq("owner_id", user.id).in("item_id", ids).order("sort_order") : { data: [] };
  const cards = await Promise.all((items ?? []).map(async (item) => {
    const asset = assets?.find((candidate) => candidate.item_id === item.id && candidate.bucket_id === "listing-media-public") ?? assets?.find((candidate) => candidate.item_id === item.id && !candidate.ai_generated) ?? assets?.find((candidate) => candidate.item_id === item.id);
    let image = "/demo-chair.svg";
    if (asset?.bucket_id === "listing-media-public") image = supabase.storage.from(asset.bucket_id).getPublicUrl(asset.storage_path).data.publicUrl;
    else if (asset) image = (await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 60 * 60)).data?.signedUrl ?? image;
    return { id: item.id, slug: item.slug, title: item.title || "Oggetto in lavorazione", price: (item.price_cents ?? 0) / 100, image, category: item.category, status: item.status, ai: asset?.ai_generated ?? false };
  }));
  return <ShopContent items={cards} shopHref={shop?.is_published ? `/s/${shop.slug}` : undefined} />;
}

function ShopContent({ items, shopHref }: { items: Array<{ id: string; slug: string; title: string; price: number; image: string; category: string; status: string; ai?: boolean }>; shopHref?: string }) {
  return <><div className="page-head"><div><span className="eyebrow">Inventario</span><h1 className="title">IL MIO SHOP.</h1><p>Bozze, annunci pubblicati e oggetti riservati.</p></div><div style={{ display: "flex", gap: 8 }}>{shopHref && <Link href={shopHref} className="button button-ghost">Apri vetrina <ArrowUpRight size={17} /></Link>}<Link href="/app/items/new" className="button button-coral"><Plus size={17} /> Nuovo</Link></div></div><div className="panel"><div className="panel-head"><h2>{items.length} oggetti</h2></div>{items.length ? <div className="item-grid">{items.map((item) => <ItemCard item={item} key={item.id} href={item.status === "published" && shopHref ? `${shopHref}/${item.slug}` : `/app/items/new?item=${item.id}`} />)}</div> : <p className="muted">Il tuo inventario è vuoto. Fotografa il primo ritrovamento.</p>}</div></>;
}
