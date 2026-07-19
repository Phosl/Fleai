import "server-only";

import { requireAdmin } from "@/lib/api/auth";
import { adminDatabaseMessage } from "@/lib/database-errors";
import { huntingReportSchema } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";

export class AdminDataError extends Error {}

export async function loadAdminData<T>(work: () => Promise<T>): Promise<
  { ok: true; data: T } | { ok: false; message: string }
> {
  try {
    return { ok: true, data: await work() };
  } catch (cause) {
    return { ok: false, message: cause instanceof AdminDataError ? cause.message : "Pannello non disponibile. Riprova." };
  }
}

function failAdminData(cause: unknown, operation: string, resource: string): never {
  const error = cause && typeof cause === "object" ? cause as { code?: string; message?: string; details?: string | null } : null;
  console.error(JSON.stringify({ scope: "admin_data", operation, resource, code: error?.code ?? "UNKNOWN" }));
  throw new AdminDataError(adminDatabaseMessage(error));
}

export function adminPage(value: string | undefined) {
  const parsed = Number(value ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function getAdminOverview() {
  await requireAdmin();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [users, suspended, items, pending, failedRuns] = await Promise.all([
    admin.from("profiles").select("id", { head: true, count: "exact" }),
    admin.from("profiles").select("id", { head: true, count: "exact" }).not("suspended_at", "is", null),
    admin.from("items").select("id", { head: true, count: "exact" }),
    admin.from("items").select("id", { head: true, count: "exact" }).eq("moderation_status", "pending"),
    admin.from("analysis_runs").select("id", { head: true, count: "exact" }).eq("status", "failed").gte("updated_at", since),
  ]);
  const firstError = [users, suspended, items, pending, failedRuns].find((result) => result.error)?.error;
  if (firstError) failAdminData(firstError, "overview", "profiles_items_runs");
  return {
    users: users.count ?? 0,
    suspended: suspended.count ?? 0,
    items: items.count ?? 0,
    pending: pending.count ?? 0,
    failedRuns: failedRuns.count ?? 0,
  };
}

export async function listAdminUsers(input: {
  query: string;
  status: string;
  sort: string;
  page: number;
  pageSize?: number;
}) {
  const { supabase } = await requireAdmin();
  const pageSize = input.pageSize ?? 25;
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_query: input.query,
    p_status: input.status,
    p_sort: input.sort,
    p_limit: pageSize,
    p_offset: (input.page - 1) * pageSize,
  });
  if (error) failAdminData(error, "list", "admin_list_users");
  return { rows: data ?? [], total: data?.[0]?.total_count ?? 0, pageSize };
}

export async function getAdminUserDetail(userId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const [authResult, profileResult, shopResult, usageResult, itemsResult, auditResult] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("shops").select("id,slug,name,is_published,created_at").eq("owner_id", userId).maybeSingle(),
    admin.from("usage_events").select("operation,units,occurred_at").eq("owner_id", userId).gte("occurred_at", monthStart),
    admin.from("items").select("id,title,status,moderation_status,price_cents,created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(12),
    admin.from("admin_audit_logs").select("id,action,reason,before_data,after_data,created_at").eq("target_type", "user").eq("target_id", userId).order("created_at", { ascending: false }).limit(12),
  ]);
  if (authResult.error) failAdminData(authResult.error, "detail", "auth_user");
  const dbError = [profileResult, shopResult, usageResult, itemsResult, auditResult].find((result) => result.error)?.error;
  if (dbError) failAdminData(dbError, "detail", "user");
  if (!authResult.data.user || !profileResult.data) return null;
  const usage = usageResult.data ?? [];
  return {
    auth: authResult.data.user,
    profile: profileResult.data,
    shop: shopResult.data,
    items: itemsResult.data ?? [],
    audit: auditResult.data ?? [],
    huntingUsed: usage.filter((event) => event.operation === "hunting_report").reduce((sum, event) => sum + event.units, 0),
    shopUsed: usage.filter((event) => event.operation === "shop_pack").reduce((sum, event) => sum + event.units, 0),
  };
}

export async function listAdminItems(input: {
  query: string;
  ownerId?: string;
  status: string;
  moderation: string;
  category: string;
  sort: string;
  page: number;
  pageSize?: number;
}) {
  const { supabase } = await requireAdmin();
  const pageSize = input.pageSize ?? 25;
  const { data, error } = await supabase.rpc("admin_list_items", {
    p_query: input.query,
    ...(input.ownerId ? { p_owner_id: input.ownerId } : {}),
    p_status: input.status,
    p_moderation: input.moderation,
    p_category: input.category,
    p_sort: input.sort,
    p_limit: pageSize,
    p_offset: (input.page - 1) * pageSize,
  });
  if (error) failAdminData(error, "list", "admin_list_items");
  return { rows: data ?? [], total: data?.[0]?.total_count ?? 0, pageSize };
}

export async function getAdminItemDetail(itemId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const itemResult = await admin.from("items").select("*").eq("id", itemId).maybeSingle();
  if (itemResult.error) failAdminData(itemResult.error, "detail", "item");
  if (!itemResult.data) return null;
  const item = itemResult.data;
  const [authResult, profileResult, mediaResult, reportsResult, runsResult, inquiriesResult, auditResult] = await Promise.all([
    admin.auth.admin.getUserById(item.owner_id),
    admin.from("profiles").select("display_name,suspended_at").eq("id", item.owner_id).maybeSingle(),
    admin.from("media_assets").select("id,bucket_id,storage_path,kind,alt_text,ai_generated,is_approved,sort_order,created_at").eq("item_id", itemId).order("sort_order"),
    admin.from("hunting_reports").select("id,report,confidence_score,recommendation,created_at").eq("item_id", itemId).order("created_at", { ascending: false }).limit(1),
    admin.from("analysis_runs").select("id,kind,status,progress,error_code,attempt_count,created_at,completed_at").eq("item_id", itemId).order("created_at", { ascending: false }).limit(25),
    admin.from("inquiries").select("id,buyer_name,buyer_email,message,status,notification_status,created_at").eq("listing_id", itemId).order("created_at", { ascending: false }).limit(25),
    admin.from("admin_audit_logs").select("id,action,reason,before_data,after_data,created_at").eq("target_type", "item").eq("target_id", itemId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (authResult.error) failAdminData(authResult.error, "detail", "item_owner");
  const dbError = [profileResult, mediaResult, reportsResult, runsResult, inquiriesResult, auditResult].find((result) => result.error)?.error;
  if (dbError) failAdminData(dbError, "detail", "item_related");
  const reportRow = reportsResult.data?.[0] ?? null;
  const comparablesResult = reportRow
    ? await admin.from("comparables").select("title,url,source_name,price_cents,currency,price_type,condition,similarity,observed_at").eq("report_id", reportRow.id).order("similarity", { ascending: false })
    : { data: [], error: null };
  if (comparablesResult.error) failAdminData(comparablesResult.error, "detail", "comparables");
  const media = await Promise.all((mediaResult.data ?? []).map(async (asset) => {
    if (asset.bucket_id === "listing-media-public") {
      return { ...asset, url: admin.storage.from(asset.bucket_id).getPublicUrl(asset.storage_path).data.publicUrl };
    }
    const { data, error } = await admin.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 10 * 60);
    return { ...asset, url: error ? "" : data.signedUrl };
  }));
  const parsedReport = reportRow ? huntingReportSchema.safeParse(reportRow.report) : null;
  return {
    item,
    owner: { auth: authResult.data.user, profile: profileResult.data },
    media,
    report: reportRow && parsedReport?.success ? { ...reportRow, report: parsedReport.data } : null,
    reportInvalid: Boolean(reportRow && !parsedReport?.success),
    comparables: comparablesResult.data ?? [],
    runs: runsResult.data ?? [],
    inquiries: inquiriesResult.data ?? [],
    audit: auditResult.data ?? [],
  };
}

export async function listAdminAudit(input: {
  targetType?: "user" | "item";
  action?: string;
  page: number;
  pageSize?: number;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const pageSize = input.pageSize ?? 50;
  let query = admin.from("admin_audit_logs")
    .select("id,actor_id,action,target_type,target_id,reason,before_data,after_data,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((input.page - 1) * pageSize, input.page * pageSize - 1);
  if (input.targetType) query = query.eq("target_type", input.targetType);
  if (input.action) query = query.ilike("action", `%${input.action}%`);
  const { data, error, count } = await query;
  if (error) failAdminData(error, "list", "admin_audit_logs");
  const actorIds = [...new Set((data ?? []).flatMap((row) => row.actor_id ? [row.actor_id] : []))];
  const actors = await Promise.all(actorIds.map(async (id) => {
    const { data: actor } = await admin.auth.admin.getUserById(id);
    return [id, actor.user?.email ?? "Admin"] as const;
  }));
  const actorMap = new Map(actors);
  return {
    rows: (data ?? []).map((row) => ({ ...row, actorEmail: row.actor_id ? actorMap.get(row.actor_id) ?? "Admin" : "Admin eliminato" })),
    total: count ?? 0,
    pageSize,
  };
}
