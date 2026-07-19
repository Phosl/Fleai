import "server-only";

import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";

type PublishItemInput = {
  ownerId: string;
  itemId: string;
  title: string;
  description: string;
  condition: string;
  defects: string[];
  price: number;
  approvedMediaIds: string[];
};

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  return "jpg";
}

export async function publishItem(input: PublishItemInput) {
  const admin = createAdminClient();
  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id,slug,status,moderation_status")
    .eq("id", input.itemId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!item) throw new ApiError(404, "ITEM_NOT_FOUND", "Oggetto non trovato.");
  if (item.status === "published" || item.status === "reserved") {
    return { status: item.status, slug: item.slug };
  }
  if (item.moderation_status !== "approved") {
    throw new ApiError(409, "MODERATION_REQUIRED", "Approva l'oggetto prima di pubblicarlo.");
  }

  const { data: media, error: mediaError } = await admin
    .from("media_assets")
    .select("*")
    .eq("owner_id", input.ownerId)
    .eq("item_id", input.itemId)
    .eq("bucket_id", "item-media-private")
    .in("id", input.approvedMediaIds);
  if (mediaError) throw mediaError;
  if (media.length !== input.approvedMediaIds.length || !media.some((asset) => asset.kind === "real")) {
    throw new ApiError(400, "REAL_PHOTO_REQUIRED", "Approva almeno una foto reale dell'oggetto.");
  }

  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("id,slug")
    .eq("owner_id", input.ownerId)
    .single();
  if (shopError) throw shopError;

  for (const [index, asset] of media.entries()) {
    const { data: binary, error: downloadError } = await admin.storage
      .from(asset.bucket_id)
      .download(asset.storage_path);
    if (downloadError) throw downloadError;
    const targetPath = `${input.ownerId}/${input.itemId}/${String(index).padStart(2, "0")}-${asset.id}.${extensionFor(asset.mime_type)}`;
    const { error: uploadError } = await admin.storage.from("listing-media-public").upload(targetPath, binary, {
      contentType: asset.mime_type,
      upsert: true,
      cacheControl: "31536000",
    });
    if (uploadError) throw uploadError;
    const { error: publicAssetError } = await admin.from("media_assets").upsert({
      owner_id: input.ownerId,
      item_id: input.itemId,
      kind: asset.kind,
      bucket_id: "listing-media-public",
      storage_path: targetPath,
      mime_type: asset.mime_type,
      width: asset.width,
      height: asset.height,
      byte_size: asset.byte_size,
      alt_text: asset.alt_text,
      sort_order: index,
      is_approved: true,
      ai_generated: asset.ai_generated,
      source_asset_id: asset.id,
    }, { onConflict: "bucket_id,storage_path" });
    if (publicAssetError) throw publicAssetError;
  }

  const itemSlug = `${slugify(input.title) || "oggetto"}-${input.itemId.slice(0, 6)}`;
  const publishedAt = new Date().toISOString();
  const [{ error: updateError }, { error: shopUpdateError }, { error: approvalError }] = await Promise.all([
    admin.from("items").update({
      shop_id: shop.id,
      slug: itemSlug,
      title: input.title,
      description: input.description,
      condition: input.condition,
      defects: input.defects,
      price_cents: Math.round(input.price * 100),
      status: "published",
      published_at: publishedAt,
    }).eq("id", input.itemId).eq("owner_id", input.ownerId),
    admin.from("shops").update({ is_published: true }).eq("id", shop.id),
    admin.from("media_assets").update({ is_approved: true }).in("id", input.approvedMediaIds).eq("owner_id", input.ownerId),
  ]);
  if (updateError) throw updateError;
  if (shopUpdateError) throw shopUpdateError;
  if (approvalError) throw approvalError;
  return { status: "published" as const, slug: itemSlug, shopSlug: shop.slug, publishedAt };
}

export async function removePublicItemMedia(itemId: string) {
  const admin = createAdminClient();
  const { data: assets, error } = await admin
    .from("media_assets")
    .select("id,storage_path")
    .eq("item_id", itemId)
    .eq("bucket_id", "listing-media-public");
  if (error) throw error;
  if (!assets.length) return;
  const { error: storageError } = await admin.storage
    .from("listing-media-public")
    .remove(assets.map((asset) => asset.storage_path));
  if (storageError) throw storageError;
  const { error: rowsError } = await admin
    .from("media_assets")
    .delete()
    .in("id", assets.map((asset) => asset.id));
  if (rowsError) throw rowsError;
}
