import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRenderMetadata } from "@/lib/social/creatomate";

export async function POST(request: Request) {
  const event = await request.json().catch(() => null) as { id?: string; render_id?: string; status?: string; metadata?: unknown } | null;
  const verifiedMetadata = verifyRenderMetadata(event?.metadata);
  if (!verifiedMetadata) return Response.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  const renderId = event?.render_id ?? event?.id;
  if (!renderId || !serverEnv.creatomateApiKey) return Response.json({ error: "INVALID_EVENT" }, { status: 400 });

  const admin = createAdminClient();
  const eventId = `${renderId}:${event?.status ?? "update"}`;
  const providerResponse = await fetch(`https://api.creatomate.com/v2/renders/${encodeURIComponent(renderId)}`, {
    headers: { authorization: `Bearer ${serverEnv.creatomateApiKey}` },
    cache: "no-store",
  });
  if (!providerResponse.ok) return Response.json({ error: "RENDER_LOOKUP_FAILED" }, { status: 502 });
  const render = await providerResponse.json() as { id: string; status: string; url?: string; metadata?: unknown };
  const retrievedMetadata = verifyRenderMetadata(render.metadata);
  if (!retrievedMetadata || retrievedMetadata.packId !== verifiedMetadata.packId) return Response.json({ error: "RENDER_MISMATCH" }, { status: 401 });
  const { data: pack, error: packError } = await admin.from("social_packs").select("id,item_id,owner_id,run_id").eq("id", retrievedMetadata.packId).eq("render_provider_id", render.id).maybeSingle();
  if (packError) return Response.json({ error: "PACK_LOOKUP_FAILED" }, { status: 500 });
  if (!pack) return Response.json({ ok: true, ignored: true });

  const { error: eventError } = await admin.from("webhook_events").insert({ provider: "creatomate", event_id: eventId });
  if (eventError?.code === "23505") return Response.json({ ok: true, duplicate: true });
  if (eventError) return Response.json({ error: "EVENT_STORE_FAILED" }, { status: 500 });

  if (render.status === "failed") {
    await Promise.all([
      admin.from("social_packs").update({ status: "failed", error_code: "VIDEO_RENDER_FAILED" }).eq("id", pack.id),
      pack.run_id ? admin.from("analysis_runs").update({ status: "failed", progress: 100, error_code: "VIDEO_RENDER_FAILED", completed_at: new Date().toISOString() }).eq("id", pack.run_id) : Promise.resolve(),
    ]);
    return Response.json({ ok: true, status: "failed" });
  }
  if (render.status !== "succeeded" || !render.url) {
    await admin.from("social_packs").update({ status: "rendering" }).eq("id", pack.id);
    return Response.json({ ok: true, status: "rendering" });
  }

  const videoResponse = await fetch(render.url, { cache: "no-store" });
  if (!videoResponse.ok) {
    await admin.from("webhook_events").delete().eq("provider", "creatomate").eq("event_id", eventId);
    return Response.json({ error: "VIDEO_DOWNLOAD_FAILED" }, { status: 502 });
  }
  const video = await videoResponse.blob();
  const storagePath = `${pack.owner_id}/${pack.item_id}/social-${render.id}.mp4`;
  const { error: uploadError } = await admin.storage.from("item-media-private").upload(storagePath, video, {
    contentType: "video/mp4",
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) {
    await admin.from("webhook_events").delete().eq("provider", "creatomate").eq("event_id", eventId);
    return Response.json({ error: "VIDEO_UPLOAD_FAILED" }, { status: 500 });
  }
  const { error: mediaError } = await admin.from("media_assets").upsert({
    owner_id: pack.owner_id,
    item_id: pack.item_id,
    kind: "social_video",
    bucket_id: "item-media-private",
    storage_path: storagePath,
    mime_type: "video/mp4",
    byte_size: video.size,
    alt_text: "Slideshow verticale di 10 secondi · Visualizzazione AI",
    ai_generated: true,
    is_approved: false,
  }, { onConflict: "bucket_id,storage_path" });
  if (mediaError) {
    await admin.from("webhook_events").delete().eq("provider", "creatomate").eq("event_id", eventId);
    return Response.json({ error: "MEDIA_STORE_FAILED" }, { status: 500 });
  }
  await Promise.all([
    admin.from("social_packs").update({ status: "completed", error_code: null }).eq("id", pack.id),
    pack.run_id ? admin.from("analysis_runs").update({ status: "completed", progress: 100, result: { socialPackId: pack.id, videoAssetPath: storagePath }, completed_at: new Date().toISOString(), error_code: null }).eq("id", pack.run_id) : Promise.resolve(),
  ]);
  return Response.json({ ok: true, status: "completed" });
}
