import { z } from "zod";
import { publishItemSchema } from "@/lib/contracts";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/api/auth";
import { requireOwnedItem } from "@/lib/api/ownership";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  return "jpg";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    z.string().uuid().parse(request.headers.get("idempotency-key"));
    const { id } = await context.params;
    const input = publishItemSchema.parse(await request.json());
    const item = await requireOwnedItem(supabase, user.id, id);
    if (item.status === "published" || item.status === "reserved") {
      return Response.json({ status: item.status, slug: item.slug });
    }
    if (item.moderation_status !== "approved") {
      throw new ApiError(409, "MODERATION_REQUIRED", "Completa la verifica dell’oggetto prima di pubblicare.");
    }

    const admin = createAdminClient();
    const { data: media, error: mediaError } = await admin
      .from("media_assets")
      .select("*")
      .eq("owner_id", user.id)
      .eq("item_id", item.id)
      .in("id", input.approvedMediaIds);
    if (mediaError) throw mediaError;
    if (media.length !== input.approvedMediaIds.length || !media.some((asset) => asset.kind === "real")) {
      throw new ApiError(400, "REAL_PHOTO_REQUIRED", "Approva almeno una foto reale dell’oggetto.");
    }

    const { data: shop, error: shopError } = await admin
      .from("shops")
      .select("id,slug")
      .eq("owner_id", user.id)
      .single();
    if (shopError) throw shopError;

    for (const [index, asset] of media.entries()) {
      const { data: binary, error: downloadError } = await admin.storage.from(asset.bucket_id).download(asset.storage_path);
      if (downloadError) throw downloadError;
      const targetPath = `${user.id}/${item.id}/${String(index).padStart(2, "0")}-${asset.id}.${extensionFor(asset.mime_type)}`;
      const { error: uploadError } = await admin.storage.from("listing-media-public").upload(targetPath, binary, {
        contentType: asset.mime_type,
        upsert: true,
        cacheControl: "31536000",
      });
      if (uploadError) throw uploadError;
      const { error: publicAssetError } = await admin.from("media_assets").upsert({
        owner_id: user.id,
        item_id: item.id,
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

    const itemSlug = `${slugify(input.title) || "oggetto"}-${item.id.slice(0, 6)}`;
    const publishedAt = new Date().toISOString();
    const [{ error: itemUpdateError }, { error: shopUpdateError }, { error: approvalError }] = await Promise.all([
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
      }).eq("id", item.id),
      admin.from("shops").update({ is_published: true }).eq("id", shop.id),
      admin.from("media_assets").update({ is_approved: true }).in("id", input.approvedMediaIds).eq("owner_id", user.id),
    ]);
    if (itemUpdateError) throw itemUpdateError;
    if (shopUpdateError) throw shopUpdateError;
    if (approvalError) throw approvalError;
    return Response.json({ status: "published", slug: itemSlug, shopSlug: shop.slug, publishedAt });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}
