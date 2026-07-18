import "server-only";

import { demoItems, demoListing } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { publicDatabaseMessage } from "@/lib/database-errors";

export type PublicShopItem = { id: string; slug: string; title: string; price: number; image: string; category: string; ai: boolean };
export type PublicShop = { id: string; slug: string; name: string; description: string; items: PublicShopItem[] };

const demoShop: PublicShop = {
  id: "55555555-5555-4555-8555-555555555555",
  slug: "officina-ritrovata",
  name: "Officina Ritrovata",
  description: "Modernariato, workwear e piccoli oggetti con una bella storia. Selezionati tra mercatini del Nord Italia.",
  items: demoItems.map((item) => ({ ...item, category: item.category, ai: item.ai })),
};

export async function getPublicShop(slug: string): Promise<{ shop: PublicShop | null; error?: string }> {
  if (isDemoMode) return { shop: slug === demoShop.slug ? demoShop : null };
  try {
    const supabase = await createClient();
    const { data: shop, error } = await supabase.from("shops").select("id,slug,name,description").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) return { shop: null, error: publicDatabaseMessage(error) };
    if (!shop) return { shop: null };
    const { data: items, error: itemError } = await supabase.from("items").select("id,slug,title,price_cents,category").eq("shop_id", shop.id).in("status", ["published", "reserved"]).eq("moderation_status", "approved").order("published_at", { ascending: false });
    if (itemError) return { shop: null, error: publicDatabaseMessage(itemError) };
    const itemIds = items?.map((item) => item.id) ?? [];
    const { data: assets } = itemIds.length ? await supabase.from("media_assets").select("item_id,storage_path,ai_generated").in("item_id", itemIds).eq("bucket_id", "listing-media-public").eq("is_approved", true).order("sort_order") : { data: [] };
    return {
      shop: {
        id: shop.id,
        slug: shop.slug,
        name: shop.name,
        description: shop.description ?? "",
        items: (items ?? []).map((item) => {
          const asset = assets?.find((candidate) => candidate.item_id === item.id);
          const image = asset ? supabase.storage.from("listing-media-public").getPublicUrl(asset.storage_path).data.publicUrl : "/demo-chair.svg";
          return { id: item.id, slug: item.slug, title: item.title, price: (item.price_cents ?? 0) / 100, image, category: item.category, ai: asset?.ai_generated ?? false };
        }),
      },
    };
  } catch {
    return { shop: null, error: "Questa vetrina non è disponibile in questo momento." };
  }
}

export async function getPublicListing(shopSlug: string, itemSlug: string) {
  if (isDemoMode) {
    const item = demoItems.find((candidate) => candidate.slug === itemSlug);
    if (!item || shopSlug !== demoShop.slug) return null;
    return { id: item.id, shop: demoShop, item, listing: demoListing, images: [
      { src: "/demo-chair.svg", label: "Foto reale", ai: false },
      { src: "/demo-chair-clean.svg", label: "Hero ripulita", ai: true },
      { src: "/demo-chair-context.svg", label: "Visualizzazione in ambiente", ai: true },
    ] };
  }
  const { shop } = await getPublicShop(shopSlug);
  if (!shop) return null;
  const supabase = await createClient();
  const { data: item } = await supabase.from("items").select("*").eq("shop_id", shop.id).eq("slug", itemSlug).in("status", ["published", "reserved"]).eq("moderation_status", "approved").maybeSingle();
  if (!item) return null;
  const { data: assets } = await supabase.from("media_assets").select("storage_path,alt_text,ai_generated").eq("item_id", item.id).eq("bucket_id", "listing-media-public").eq("is_approved", true).order("sort_order");
  return {
    id: item.id,
    shop,
    item: { id: item.id, slug: item.slug, title: item.title, price: (item.price_cents ?? 0) / 100, category: item.category, status: item.status },
    listing: { ...demoListing, title: item.title, description: item.description, category: item.category, brand: item.brand, condition: item.condition ?? "Da verificare", defects: item.defects, price: (item.price_cents ?? 0) / 100, attributes: (item.attributes ?? {}) as Record<string,string> },
    images: (assets ?? []).map((asset) => ({ src: supabase.storage.from("listing-media-public").getPublicUrl(asset.storage_path).data.publicUrl, label: asset.alt_text, ai: asset.ai_generated })),
  };
}
