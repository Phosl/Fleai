import { signedUploadSchema } from "@/lib/contracts";
import { apiErrorResponse, requireUser } from "@/lib/api/auth";
import { requireOwnedItem } from "@/lib/api/ownership";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

function safeFileName(value: string) {
  const extension = value.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${crypto.randomUUID()}.${extension.slice(0, 5)}`;
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = signedUploadSchema.parse(await request.json());
    const idempotencyKey = z.string().uuid().parse(request.headers.get("idempotency-key"));
    await requireOwnedItem(supabase, user.id, input.itemId);

    const { data: existing } = await supabase.from("media_assets").select("storage_path").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) {
      const { data: signed, error } = await createAdminClient().storage.from("item-media-private").createSignedUploadUrl(existing.storage_path);
      if (error) throw error;
      return Response.json({ path: existing.storage_path, token: signed.token });
    }

    const admin = createAdminClient();
    const path = `${user.id}/${input.itemId}/${safeFileName(input.fileName)}`;
    const { data: signed, error: signError } = await admin.storage
      .from("item-media-private")
      .createSignedUploadUrl(path);
    if (signError) throw signError;
    const { error: assetError } = await supabase.from("media_assets").insert({
      owner_id: user.id,
      item_id: input.itemId,
      kind: "real",
      bucket_id: "item-media-private",
      storage_path: path,
      mime_type: input.mimeType,
      byte_size: input.byteSize,
      alt_text: "Foto reale dell’oggetto",
      idempotency_key: idempotencyKey,
    });
    if (assetError) throw assetError;
    return Response.json({ path, token: signed.token });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}
