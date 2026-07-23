import "server-only";

import type { HuntingReportDTO } from "@/lib/contracts";
import { huntingReportSchema } from "@/lib/contracts";
import { publicDatabaseMessage, type DatabaseError } from "@/lib/database-errors";
import { demoItems, demoListing, demoReport } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];
type RunRow = Database["public"]["Tables"]["analysis_runs"]["Row"];

export type WorkspaceItemDetail = {
  item: Pick<ItemRow,
    | "id"
    | "slug"
    | "title"
    | "description"
    | "category"
    | "status"
    | "moderation_status"
    | "brand"
    | "condition"
    | "defects"
    | "attributes"
    | "price_cents"
    | "asking_price_cents"
    | "extra_costs_cents"
    | "selected_report_id"
    | "created_at"
    | "updated_at"
    | "published_at"
  >;
  media: Array<Pick<MediaRow, "id" | "kind" | "alt_text" | "ai_generated" | "is_approved" | "sort_order"> & { url: string }>;
  report: { id: string; confidenceScore: number; recommendation: string; report: HuntingReportDTO } | null;
  reportInvalid: boolean;
  runs: Array<Pick<RunRow, "id" | "kind" | "status" | "progress" | "error_code" | "attempt_count" | "created_at" | "updated_at" | "completed_at">>;
  publicHref: string | null;
  inquiryCount: number;
};

export type WorkspaceItemResult = {
  detail: WorkspaceItemDetail | null;
  error?: string;
};

const demoStatus = {
  Pubblicato: "published",
  Bozza: "draft",
  Riservato: "reserved",
} as const;

function demoWorkspaceItem(itemId: string): WorkspaceItemResult {
  const source = demoItems.find((item) => item.id === itemId);
  if (!source) return { detail: null };
  const isChair = source.id === demoItems[0].id;
  const now = new Date().toISOString();
  const status = demoStatus[source.status];
  return {
    detail: {
      item: {
        id: source.id,
        slug: source.slug,
        title: source.title,
        description: isChair ? demoListing.description : "Oggetto demo pronto per essere completato dal workspace Fleai.",
        category: isChair ? demoListing.category : source.id === demoItems[1].id ? "fashion" : "collectibles",
        status,
        moderation_status: "approved",
        brand: isChair ? demoListing.brand : null,
        condition: isChair ? demoListing.condition : "Da verificare",
        defects: isChair ? demoListing.defects : [],
        attributes: isChair ? demoListing.attributes : {},
        price_cents: source.price * 100,
        asking_price_cents: isChair ? demoReport.askingPrice * 100 : null,
        extra_costs_cents: isChair ? demoReport.extraCosts * 100 : 0,
        selected_report_id: isChair ? "demo-report" : null,
        created_at: now,
        updated_at: now,
        published_at: status === "published" ? now : null,
      },
      media: [
        { id: `${source.id}-real`, kind: "real", alt_text: `${source.title} · foto reale`, ai_generated: false, is_approved: true, sort_order: 0, url: source.image },
        ...(isChair ? [
          { id: `${source.id}-clean`, kind: "clean_ai" as const, alt_text: "Hero ripulita", ai_generated: true, is_approved: true, sort_order: 10, url: "/demo-chair-clean.svg" },
          { id: `${source.id}-context`, kind: "context_ai" as const, alt_text: "Scena contestualizzata", ai_generated: true, is_approved: true, sort_order: 11, url: "/demo-chair-context.svg" },
        ] : []),
      ],
      report: isChair ? { id: "demo-report", confidenceScore: demoReport.confidence.score, recommendation: demoReport.recommendation, report: demoReport } : null,
      reportInvalid: false,
      runs: isChair ? [{ id: "demo-listing-run", kind: "listing_draft", status: "completed", progress: 100, error_code: null, attempt_count: 1, created_at: now, updated_at: now, completed_at: now }] : [],
      publicHref: status === "published" || status === "reserved" ? `/s/officina-ritrovata/${source.slug}` : null,
      inquiryCount: 0,
    },
  };
}

function dataFailure(error: DatabaseError | null | undefined, operation: string, resource: string): WorkspaceItemResult {
  console.error(JSON.stringify({
    scope: "workspace_item",
    operation,
    resource,
    code: error?.code ?? "UNKNOWN",
  }));
  return { detail: null, error: publicDatabaseMessage(error) };
}

export async function getWorkspaceItemDetail(itemId: string): Promise<WorkspaceItemResult> {
  if (isDemoMode) return demoWorkspaceItem(itemId);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { detail: null };

    const itemResult = await supabase
      .from("items")
      .select("id,slug,title,description,category,status,moderation_status,brand,condition,defects,attributes,price_cents,asking_price_cents,extra_costs_cents,selected_report_id,created_at,updated_at,published_at")
      .eq("id", itemId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (itemResult.error) return dataFailure(itemResult.error, "detail", "items");
    if (!itemResult.data) return { detail: null };

    const reportQuery = supabase.from("hunting_reports")
      .select("id,report,confidence_score,recommendation")
      .eq("item_id", itemId)
      .eq("owner_id", user.id);
    const selectedReportQuery = itemResult.data.selected_report_id
      ? reportQuery.eq("id", itemResult.data.selected_report_id).limit(1)
      : reportQuery.order("created_at", { ascending: false }).limit(1);

    const [mediaResult, reportResult, runsResult, shopResult, inquiryResult] = await Promise.all([
      supabase.from("media_assets")
        .select("id,kind,alt_text,ai_generated,is_approved,sort_order,bucket_id,storage_path")
        .eq("item_id", itemId)
        .eq("owner_id", user.id)
        .order("sort_order"),
      selectedReportQuery,
      supabase.from("analysis_runs")
        .select("id,kind,status,progress,error_code,attempt_count,created_at,updated_at,completed_at")
        .eq("item_id", itemId)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("shops")
        .select("slug,is_published")
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase.from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", itemId)
        .eq("seller_id", user.id),
    ]);
    const relatedError = [mediaResult, reportResult, runsResult, shopResult, inquiryResult].find((result) => result.error)?.error;
    if (relatedError) return dataFailure(relatedError, "detail", "item_related");

    const signedMedia = await Promise.all((mediaResult.data ?? []).map(async (asset) => {
      if (asset.bucket_id === "listing-media-public") {
        return { ...asset, url: supabase.storage.from(asset.bucket_id).getPublicUrl(asset.storage_path).data.publicUrl };
      }
      const signed = await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 60 * 60);
      if (signed.error) {
        console.error(JSON.stringify({ scope: "workspace_item", operation: "sign_media", resource: "media_assets", code: signed.error.name }));
      }
      return { ...asset, url: signed.data?.signedUrl ?? "" };
    }));
    const media = signedMedia
      .sort((left, right) => Number(left.ai_generated) - Number(right.ai_generated) || left.sort_order - right.sort_order)
      .map((asset) => ({
        id: asset.id,
        kind: asset.kind,
        alt_text: asset.alt_text,
        ai_generated: asset.ai_generated,
        is_approved: asset.is_approved,
        sort_order: asset.sort_order,
        url: asset.url,
      }));
    const reportRow = reportResult.data?.[0] ?? null;
    const parsedReport = reportRow ? huntingReportSchema.safeParse(reportRow.report) : null;
    const isPublic = (itemResult.data.status === "published" || itemResult.data.status === "reserved")
      && itemResult.data.moderation_status === "approved"
      && Boolean(shopResult.data?.is_published);

    return {
      detail: {
        item: itemResult.data,
        media,
        report: reportRow && parsedReport?.success ? {
          id: reportRow.id,
          confidenceScore: reportRow.confidence_score,
          recommendation: reportRow.recommendation,
          report: parsedReport.data,
        } : null,
        reportInvalid: Boolean(reportRow && !parsedReport?.success),
        runs: runsResult.data ?? [],
        publicHref: isPublic && shopResult.data ? `/s/${shopResult.data.slug}/${itemResult.data.slug}` : null,
        inquiryCount: inquiryResult.count ?? 0,
      },
    };
  } catch (cause) {
    const error = cause && typeof cause === "object" ? cause as DatabaseError : null;
    return dataFailure(error, "detail", "workspace_item");
  }
}
