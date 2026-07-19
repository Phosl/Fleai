import "server-only";

import { generateListingDraft, inspectItem, moderateSubmission, researchComparables, synthesizeHuntingReport } from "@/lib/ai/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateAiRunInput } from "@/lib/contracts";
import { listingDraftSchema } from "@/lib/contracts";
import type { Json } from "@/lib/supabase/database.types";
import { generateMarketingImages } from "@/lib/ai/images";
import { createSocialRender } from "@/lib/social/creatomate";
import { formatCurrency } from "@/lib/format";
import { providerErrorCode, providerErrorMetadata } from "@/lib/ai/provider-errors";
import { shouldRetryResearchAfterSynthesis } from "@/lib/ai/model-routing";
import { isMissingSchemaError } from "@/lib/database-errors";

export class RunProcessingError extends Error {
  constructor(
    message: string,
    public readonly terminal: boolean,
  ) {
    super(message);
  }
}

function runInput(value: Json): CreateAiRunInput["input"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CreateAiRunInput["input"];
}

async function setProgress(
  runId: string,
  status: "moderating" | "inspecting" | "researching" | "synthesizing" | "generating" | "rendering",
  progress: number,
) {
  const { error } = await createAdminClient()
    .from("analysis_runs")
    .update({ status, progress, error_code: null })
    .eq("id", runId);
  if (error) throw error;
}

async function signedRealMedia(itemId: string) {
  const admin = createAdminClient();
  const { data: assets, error } = await admin
    .from("media_assets")
    .select("storage_path,bucket_id")
    .eq("item_id", itemId)
    .eq("kind", "real")
    .order("sort_order")
    .limit(3);
  if (error) throw error;
  if (!assets.length) throw new RunProcessingError("NEEDS_PHOTOS", true);
  const urls = await Promise.all(assets.map(async (asset) => {
    const { data, error: signError } = await admin.storage
      .from(asset.bucket_id)
      .createSignedUrl(asset.storage_path, 15 * 60);
    if (signError) throw signError;
    return data.signedUrl;
  }));
  return urls;
}

async function processHunting(run: {
  id: string;
  owner_id: string;
  item_id: string;
  input: Json;
}, item: {
  category: string;
  asking_price_cents: number | null;
  extra_costs_cents: number;
  attributes: Json;
}) {
  const admin = createAdminClient();
  const input = runInput(run.input);
  const imageUrls = await signedRealMedia(run.item_id);
  const notes = input.notes ?? (
    item.attributes && typeof item.attributes === "object" && !Array.isArray(item.attributes)
      ? String(item.attributes.notes ?? "")
      : ""
  );

  await setProgress(run.id, "moderating", 10);
  const moderation = await moderateSubmission(imageUrls, notes);
  if (!moderation.allowed) {
    await Promise.all([
      admin.from("items").update({ moderation_status: "blocked" }).eq("id", run.item_id),
      admin.from("analysis_runs").update({ status: "failed", progress: 100, error_code: "CONTENT_BLOCKED", provider_request_id: moderation.requestId, completed_at: new Date().toISOString() }).eq("id", run.id),
    ]);
    throw new RunProcessingError("CONTENT_BLOCKED", true);
  }

  await setProgress(run.id, "inspecting", 30);
  const inspection = await inspectItem({ userId: run.owner_id, imageUrls, notes, categoryHint: item.category });
  if (!inspection.result.marketplacePolicy.allowed) {
    await Promise.all([
      admin.from("items").update({ moderation_status: "blocked" }).eq("id", run.item_id),
      admin.from("analysis_runs").update({ status: "failed", progress: 100, error_code: "PROHIBITED_ITEM", provider_request_id: inspection.requestId, completed_at: new Date().toISOString() }).eq("id", run.id),
    ]);
    throw new RunProcessingError("PROHIBITED_ITEM", true);
  }

  await setProgress(run.id, "researching", 55);
  let research = await researchComparables({ userId: run.owner_id, inspection: inspection.result });
  const synthesize = () => synthesizeHuntingReport({
      userId: run.owner_id,
      inspection: inspection.result,
      researchNarrative: research.narrative,
      sources: research.sources,
      askingPrice: input.askingPrice ?? (item.asking_price_cents ?? 0) / 100,
      extraCosts: input.extraCosts ?? item.extra_costs_cents / 100,
    });

  await setProgress(run.id, "synthesizing", 75);
  let synthesized = await synthesize();
  if (
    research.fallbackAvailable &&
    !research.usedFallback &&
    shouldRetryResearchAfterSynthesis(synthesized.report.comparables)
  ) {
    await setProgress(run.id, "researching", 82);
    research = await researchComparables(
      { userId: run.owner_id, inspection: inspection.result },
      { forceFallback: true },
    );
    await setProgress(run.id, "synthesizing", 90);
    synthesized = await synthesize();
  }

  const { data: storedReport, error: reportError } = await admin
    .from("hunting_reports")
    .upsert({
      owner_id: run.owner_id,
      item_id: run.item_id,
      run_id: run.id,
      report: synthesized.report as unknown as Json,
      confidence_score: synthesized.report.confidence.score,
      recommendation: synthesized.report.recommendation,
    }, { onConflict: "run_id" })
    .select("id")
    .single();
  if (reportError) throw reportError;

  if (synthesized.report.comparables.length) {
    const { error: comparableError } = await admin.from("comparables").upsert(
      synthesized.report.comparables.map((comparable) => ({
        report_id: storedReport.id,
        title: comparable.title,
        url: comparable.url,
        source_name: comparable.sourceName,
        price_cents: comparable.price === null ? null : Math.round(comparable.price * 100),
        currency: comparable.currency,
        price_type: comparable.priceType,
        condition: comparable.condition,
        similarity: comparable.similarity,
        observed_at: comparable.observedAt,
      })),
      { onConflict: "report_id,url" },
    );
    if (comparableError) throw comparableError;
  }

  const completedAt = new Date().toISOString();
  const [{ error: itemError }, { error: runError }, { error: usageError }] = await Promise.all([
    admin.from("items").update({
      title: synthesized.report.identification.label,
      selected_report_id: storedReport.id,
      moderation_status: "approved",
    }).eq("id", run.item_id),
    admin.from("analysis_runs").update({
      status: "completed",
      progress: 100,
      result: synthesized.report as unknown as Json,
      provider_request_id: synthesized.requestId,
      completed_at: completedAt,
      error_code: null,
    }).eq("id", run.id),
    admin.from("usage_events").upsert({
      owner_id: run.owner_id,
      run_id: run.id,
      operation: "hunting_report",
      units: 1,
      provider: "openai",
      provider_request_id: synthesized.requestId,
      occurred_at: completedAt,
    }, { onConflict: "run_id,operation" }),
  ]);
  if (itemError) throw itemError;
  if (runError) throw runError;
  if (usageError) throw usageError;
  return synthesized.report;
}

async function processListing(run: { id: string; owner_id: string; item_id: string; input: Json }) {
  const admin = createAdminClient();
  const { data: reportRow, error: reportError } = await admin
    .from("hunting_reports")
    .select("report")
    .eq("item_id", run.item_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reportError) throw reportError;
  if (!reportRow) {
    await admin.from("analysis_runs").update({ status: "needs_input", progress: 100, error_code: "HUNTING_REPORT_REQUIRED" }).eq("id", run.id);
    throw new RunProcessingError("HUNTING_REPORT_REQUIRED", true);
  }
  await setProgress(run.id, "generating", 45);
  const generated = await generateListingDraft({
    userId: run.owner_id,
    report: reportRow.report as never,
  });
  const draft = generated.draft;
  const completedAt = new Date().toISOString();
  const [{ error: itemError }, { error: runError }, { error: usageError }] = await Promise.all([
    admin.from("items").update({
      title: draft.title,
      slug: `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55)}-${run.item_id.slice(0, 6)}`,
      description: draft.description,
      category: draft.category,
      brand: draft.brand,
      condition: draft.condition,
      defects: draft.defects,
      price_cents: Math.round(draft.price * 100),
      attributes: draft.attributes,
    }).eq("id", run.item_id),
    admin.from("analysis_runs").update({ status: "completed", progress: 100, result: draft as unknown as Json, provider_request_id: generated.requestId, completed_at: completedAt, error_code: null }).eq("id", run.id),
    admin.from("usage_events").upsert({ owner_id: run.owner_id, run_id: run.id, operation: "shop_pack", units: 1, provider: "openai", provider_request_id: generated.requestId, occurred_at: completedAt }, { onConflict: "run_id,operation" }),
  ]);
  if (itemError) throw itemError;
  if (runError) throw runError;
  if (usageError) throw usageError;
  return draft;
}

async function realMediaBuffers(itemId: string) {
  const admin = createAdminClient();
  const { data: assets, error } = await admin.from("media_assets").select("id,bucket_id,storage_path").eq("item_id", itemId).eq("kind", "real").order("sort_order").limit(3);
  if (error) throw error;
  if (!assets.length) throw new RunProcessingError("NEEDS_PHOTOS", true);
  const buffers = await Promise.all(assets.map(async (asset) => {
    const { data, error: downloadError } = await admin.storage.from(asset.bucket_id).download(asset.storage_path);
    if (downloadError) throw downloadError;
    return Buffer.from(await data.arrayBuffer());
  }));
  return { assets, buffers };
}

async function processMarketing(run: { id: string; owner_id: string; item_id: string; input: Json }, item: { category: string; title: string }) {
  const admin = createAdminClient();
  const input = runInput(run.input);
  const source = await realMediaBuffers(run.item_id);
  await setProgress(run.id, "generating", 30);
  const generated = await generateMarketingImages({
    userId: run.owner_id,
    sourceImages: source.buffers,
    objectDescription: item.title,
    category: item.category,
    tryOn: input.tryOn,
  });
  const assetIds: string[] = [];
  for (const [index, image] of generated.images.entries()) {
    const path = `${run.owner_id}/${run.item_id}/${run.id}-${image.kind}-${index}.jpg`;
    const { error: uploadError } = await admin.storage.from("item-media-private").upload(path, image.buffer, {
      contentType: image.mimeType,
      upsert: true,
      cacheControl: "3600",
    });
    if (uploadError) throw uploadError;
    const { data: asset, error: assetError } = await admin.from("media_assets").upsert({
      owner_id: run.owner_id,
      item_id: run.item_id,
      kind: image.kind,
      bucket_id: "item-media-private",
      storage_path: path,
      mime_type: image.mimeType,
      width: image.width,
      height: image.height,
      byte_size: image.buffer.byteLength,
      alt_text: image.label,
      sort_order: 10 + index,
      ai_generated: true,
      is_approved: false,
      source_asset_id: source.assets[0]?.id ?? null,
    }, { onConflict: "bucket_id,storage_path" }).select("id").single();
    if (assetError) throw assetError;
    assetIds.push(asset.id);
  }
  const completedAt = new Date().toISOString();
  const { error } = await admin.from("analysis_runs").update({
    status: "completed",
    progress: 100,
    result: { assetIds, watermark: "Visualizzazione AI" },
    provider_request_id: generated.requestIds[0] ?? null,
    completed_at: completedAt,
    error_code: null,
  }).eq("id", run.id);
  if (error) throw error;
  return { assetIds };
}

async function processSocial(run: { id: string; owner_id: string; item_id: string }) {
  const admin = createAdminClient();
  const { data: listingRun, error: listingError } = await admin.from("analysis_runs").select("result").eq("item_id", run.item_id).eq("kind", "listing_draft").eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle();
  if (listingError) throw listingError;
  if (!listingRun?.result) throw new RunProcessingError("LISTING_DRAFT_REQUIRED", true);
  const draft = listingDraftSchema.parse(listingRun.result);
  const { data: pack, error: packError } = await admin.from("social_packs").upsert({
    owner_id: run.owner_id,
    item_id: run.item_id,
    run_id: run.id,
    status: "rendering",
    instagram_caption: draft.instagramCaption,
    tiktok_caption: draft.tiktokCaption,
    hashtags: draft.hashtags,
  }, { onConflict: "run_id" }).select("id").single();
  if (packError) throw packError;

  const { data: media, error: mediaError } = await admin.from("media_assets").select("bucket_id,storage_path").eq("item_id", run.item_id).in("kind", ["real", "clean_ai", "context_ai", "social_still"]).order("sort_order").limit(4);
  if (mediaError) throw mediaError;
  if (!media.length) throw new RunProcessingError("MEDIA_REQUIRED", true);
  const imageUrls = await Promise.all(media.map(async (asset) => {
    const { data, error } = await admin.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 24 * 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  }));
  await setProgress(run.id, "rendering", 88);
  const render = await createSocialRender({
    packId: pack.id,
    title: draft.title,
    priceLabel: formatCurrency(draft.price),
    imageUrls,
  });
  const [{ error: socialError }, { error: runError }] = await Promise.all([
    admin.from("social_packs").update({ render_provider_id: render.id, status: "rendering" }).eq("id", pack.id),
    admin.from("analysis_runs").update({ status: "rendering", progress: 92, provider_request_id: render.id, result: { socialPackId: pack.id, video: "rendering" } }).eq("id", run.id),
  ]);
  if (socialError) throw socialError;
  if (runError) throw runError;
  return { socialPackId: pack.id, renderId: render.id };
}

export async function processAnalysisRun(runId: string) {
  const admin = createAdminClient();
  const { data: run, error: runError } = await admin.from("analysis_runs").select("*").eq("id", runId).maybeSingle();
  if (runError) throw runError;
  if (!run) throw new RunProcessingError("RUN_NOT_FOUND", true);
  if (run.status === "completed" || run.status === "failed") return run.result;
  const { data: ownerProfile, error: profileError } = await admin
    .from("profiles")
    .select("suspended_at")
    .eq("id", run.owner_id)
    .maybeSingle();
  if (profileError && !isMissingSchemaError(profileError)) throw profileError;
  if (ownerProfile?.suspended_at) {
    await admin.from("analysis_runs").update({
      status: "failed",
      progress: 100,
      error_code: "ACCOUNT_SUSPENDED",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    throw new RunProcessingError("ACCOUNT_SUSPENDED", true);
  }

  const attempt = run.attempt_count + 1;
  await admin.from("analysis_runs").update({ attempt_count: attempt }).eq("id", run.id);
  try {
    const { data: item, error: itemError } = await admin
      .from("items")
      .select("category,title,asking_price_cents,extra_costs_cents,attributes")
      .eq("id", run.item_id)
      .single();
    if (itemError) throw itemError;
    if (run.kind === "hunting_report") return await processHunting(run, item);
    if (run.kind === "listing_draft") return await processListing(run);
    if (run.kind === "marketing_images") return await processMarketing(run, item);
    if (run.kind === "social_pack") return await processSocial(run);
    throw new RunProcessingError("UNKNOWN_RUN_KIND", true);
  } catch (cause) {
    if (cause instanceof RunProcessingError && cause.terminal) {
      const needsInput = cause.message.includes("REQUIRED") || cause.message === "NEEDS_PHOTOS" || cause.message === "MEDIA_REQUIRED";
      await admin.from("analysis_runs").update({
        status: needsInput ? "needs_input" : "failed",
        progress: 100,
        error_code: cause.message,
        completed_at: needsInput ? null : new Date().toISOString(),
      }).eq("id", run.id).neq("status", "completed");
      throw cause;
    }
    const terminal = attempt >= 3;
    const errorCode = providerErrorCode(cause);
    console.error(JSON.stringify({
      scope: "analysis_run",
      event: "attempt_failed",
      runId: run.id,
      kind: run.kind,
      attempt,
      errorCode,
      ...providerErrorMetadata(cause),
    }));
    await admin.from("analysis_runs").update({
      status: terminal ? "failed" : "queued",
      progress: terminal ? 100 : 0,
      error_code: errorCode,
      completed_at: terminal ? new Date().toISOString() : null,
    }).eq("id", run.id);
    if (terminal && run.kind === "social_pack") {
      await admin.from("social_packs").update({ status: "failed", error_code: errorCode }).eq("run_id", run.id);
    }
    throw new RunProcessingError(errorCode, terminal);
  }
}
