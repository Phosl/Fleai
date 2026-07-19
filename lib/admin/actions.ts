import "server-only";

import { ApiError } from "@/lib/api/auth";
import type {
  AdminItemUpdateInput,
  AdminUserUpdateInput,
  ItemStatus,
  ModerationStatus,
} from "@/lib/contracts";
import { publishItemSchema } from "@/lib/contracts";
import { removePublicItemMedia, publishItem } from "@/lib/items/publication";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { assertAdminTargetCanBeSuspended, canAdminTransitionItem } from "@/lib/admin/rules";

type AuditTarget = "user" | "item";

function auditChanges(before: Record<string, unknown>, after: Record<string, unknown>) {
  const beforeData: Record<string, Json> = {};
  const afterData: Record<string, Json> = {};

  for (const [field, value] of Object.entries(after)) {
    if (JSON.stringify(before[field]) === JSON.stringify(value)) continue;
    beforeData[field] = before[field] as Json;
    afterData[field] = value as Json;
  }

  return { before: beforeData, after: afterData };
}

async function existingAudit(actorId: string, idempotencyKey: string) {
  const { data, error } = await createAdminClient()
    .from("admin_audit_logs")
    .select("id,action,target_type,target_id,created_at")
    .eq("actor_id", actorId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function recordAudit(input: {
  actorId: string;
  action: string;
  targetType: AuditTarget;
  targetId: string;
  reason: string;
  before: Json;
  after: Json;
  idempotencyKey: string;
}) {
  const { data, error } = await createAdminClient().from("admin_audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    before_data: input.before,
    after_data: input.after,
    idempotency_key: input.idempotencyKey,
  }).select("id,created_at").single();
  if (error) throw error;
  return data;
}

export async function updateAdminUser(input: {
  actorId: string;
  targetId: string;
  idempotencyKey: string;
  values: AdminUserUpdateInput;
}) {
  const duplicate = await existingAudit(input.actorId, input.idempotencyKey);
  if (duplicate) return { duplicate: true, audit: duplicate };
  const admin = createAdminClient();
  const { data: before, error: readError } = await admin
    .from("profiles")
    .select("display_name,bio,hunting_limit_override,shop_limit_override")
    .eq("id", input.targetId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new ApiError(404, "USER_NOT_FOUND", "Utente non trovato.");
  const after = {
    display_name: input.values.displayName,
    bio: input.values.bio,
    hunting_limit_override: input.values.huntingLimitOverride,
    shop_limit_override: input.values.shopLimitOverride,
  };
  const changes = auditChanges(before, after);
  if (Object.keys(changes.after).length) {
    const { error: updateError } = await admin.from("profiles").update(changes.after).eq("id", input.targetId);
    if (updateError) throw updateError;
  }
  const audit = await recordAudit({
    actorId: input.actorId,
    action: "user.profile_updated",
    targetType: "user",
    targetId: input.targetId,
    reason: input.values.reason,
    before: changes.before,
    after: changes.after,
    idempotencyKey: input.idempotencyKey,
  });
  return { duplicate: false, audit };
}

export async function setAdminUserSuspension(input: {
  actorId: string;
  targetId: string;
  idempotencyKey: string;
  suspended: boolean;
  reason: string;
}) {
  const duplicate = await existingAudit(input.actorId, input.idempotencyKey);
  if (duplicate) return { duplicate: true, authSynced: true, audit: duplicate };
  const admin = createAdminClient();
  const [{ data: authData, error: authReadError }, { data: profile, error: profileError }] = await Promise.all([
    admin.auth.admin.getUserById(input.targetId),
    admin.from("profiles").select("suspended_at,suspension_reason").eq("id", input.targetId).maybeSingle(),
  ]);
  if (authReadError) throw authReadError;
  if (profileError) throw profileError;
  if (!authData.user || !profile) throw new ApiError(404, "USER_NOT_FOUND", "Utente non trovato.");
  if (input.suspended) {
    const targetError = assertAdminTargetCanBeSuspended({
      actorId: input.actorId,
      targetId: input.targetId,
      targetIsAdmin: authData.user.app_metadata?.role === "admin",
    });
    if (targetError) throw new ApiError(409, "ADMIN_SUSPENSION_FORBIDDEN", targetError);
  }

  const before = { suspended_at: profile.suspended_at, suspension_reason: profile.suspension_reason };
  if (!input.suspended) {
    const { error: authError } = await admin.auth.admin.updateUserById(input.targetId, { ban_duration: "none" });
    if (authError) throw new ApiError(502, "AUTH_SYNC_FAILED", "Supabase Auth non ha riattivato l'utente. Riprova.");
  }

  const after = input.suspended
    ? { suspended_at: new Date().toISOString(), suspension_reason: input.reason }
    : { suspended_at: null, suspension_reason: null };
  const changes = auditChanges(before, after);
  const { error: updateError } = await admin.from("profiles").update(after).eq("id", input.targetId);
  if (updateError) throw updateError;
  const audit = await recordAudit({
    actorId: input.actorId,
    action: input.suspended ? "user.suspended" : "user.reactivated",
    targetType: "user",
    targetId: input.targetId,
    reason: input.reason,
    before: changes.before,
    after: changes.after,
    idempotencyKey: input.idempotencyKey,
  });

  if (!input.suspended) return { duplicate: false, authSynced: true, audit };
  const { error: authError } = await admin.auth.admin.updateUserById(input.targetId, { ban_duration: "876000h" });
  return {
    duplicate: false,
    authSynced: !authError,
    warning: authError ? "Account bloccato in Fleai, ma il ban Supabase Auth va ritentato." : undefined,
    audit,
  };
}

export async function updateAdminItem(input: {
  actorId: string;
  itemId: string;
  idempotencyKey: string;
  values: AdminItemUpdateInput;
}) {
  const duplicate = await existingAudit(input.actorId, input.idempotencyKey);
  if (duplicate) return { duplicate: true, audit: duplicate };
  const admin = createAdminClient();
  const { data: before, error: readError } = await admin
    .from("items")
    .select("title,description,category,brand,condition,defects,price_cents,asking_price_cents,extra_costs_cents")
    .eq("id", input.itemId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new ApiError(404, "ITEM_NOT_FOUND", "Oggetto non trovato.");
  const after = {
    title: input.values.title,
    description: input.values.description,
    category: input.values.category,
    brand: input.values.brand,
    condition: input.values.condition,
    defects: input.values.defects,
    price_cents: input.values.price === null ? null : Math.round(input.values.price * 100),
    asking_price_cents: input.values.askingPrice === null ? null : Math.round(input.values.askingPrice * 100),
    extra_costs_cents: Math.round(input.values.extraCosts * 100),
  };
  const changes = auditChanges(before, after);
  if (Object.keys(changes.after).length) {
    const { error: updateError } = await admin.from("items").update(changes.after).eq("id", input.itemId);
    if (updateError) throw updateError;
  }
  const audit = await recordAudit({
    actorId: input.actorId,
    action: "item.updated",
    targetType: "item",
    targetId: input.itemId,
    reason: input.values.reason,
    before: changes.before,
    after: changes.after,
    idempotencyKey: input.idempotencyKey,
  });
  return { duplicate: false, audit };
}

export async function moderateAdminItem(input: {
  actorId: string;
  itemId: string;
  idempotencyKey: string;
  decision: ModerationStatus;
  reason: string;
}) {
  const duplicate = await existingAudit(input.actorId, input.idempotencyKey);
  if (duplicate) return { duplicate: true, mediaCleanup: true, audit: duplicate };
  const admin = createAdminClient();
  const { data: item, error: readError } = await admin
    .from("items")
    .select("moderation_status,status,published_at")
    .eq("id", input.itemId)
    .maybeSingle();
  if (readError) throw readError;
  if (!item) throw new ApiError(404, "ITEM_NOT_FOUND", "Oggetto non trovato.");
  const after = input.decision === "blocked"
    ? { moderation_status: input.decision, status: "archived" as const, published_at: null }
    : input.decision === "pending" && (item.status === "published" || item.status === "reserved")
      ? { moderation_status: input.decision, status: "archived" as const, published_at: null }
      : { moderation_status: input.decision, status: item.status, published_at: item.published_at };
  const changes = auditChanges(item, after);
  const { error: updateError } = await admin.from("items").update(after).eq("id", input.itemId);
  if (updateError) throw updateError;
  const audit = await recordAudit({
    actorId: input.actorId,
    action: `item.moderation_${input.decision}`,
    targetType: "item",
    targetId: input.itemId,
    reason: input.reason,
    before: changes.before,
    after: changes.after,
    idempotencyKey: input.idempotencyKey,
  });
  if (input.decision !== "blocked") return { duplicate: false, mediaCleanup: true, audit };
  try {
    await removePublicItemMedia(input.itemId);
    return { duplicate: false, mediaCleanup: true, audit };
  } catch (cause) {
    console.error(JSON.stringify({ scope: "admin_item", operation: "remove_public_media", itemId: input.itemId, error: cause instanceof Error ? cause.name : "unknown" }));
    return { duplicate: false, mediaCleanup: false, warning: "Oggetto bloccato, ma alcune copie pubbliche vanno rimosse ritentando l'azione.", audit };
  }
}

export async function transitionAdminItem(input: {
  actorId: string;
  itemId: string;
  idempotencyKey: string;
  status: ItemStatus;
  approvedMediaIds: string[];
  reason: string;
}) {
  const duplicate = await existingAudit(input.actorId, input.idempotencyKey);
  if (duplicate) return { duplicate: true, audit: duplicate };
  const admin = createAdminClient();
  const { data: item, error: readError } = await admin
    .from("items")
    .select("owner_id,title,description,condition,defects,price_cents,status,moderation_status,published_at")
    .eq("id", input.itemId)
    .maybeSingle();
  if (readError) throw readError;
  if (!item) throw new ApiError(404, "ITEM_NOT_FOUND", "Oggetto non trovato.");
  if (!canAdminTransitionItem(item.status, input.status)) {
    throw new ApiError(409, "INVALID_ITEM_TRANSITION", `Transizione ${item.status} → ${input.status} non consentita.`);
  }
  if (item.status === input.status) {
    const audit = await recordAudit({
      actorId: input.actorId,
      action: `item.status_${input.status}`,
      targetType: "item",
      targetId: input.itemId,
      reason: input.reason,
      before: {},
      after: {},
      idempotencyKey: input.idempotencyKey,
    });
    return { duplicate: false, unchanged: true, audit };
  }

  if (input.status === "published" && item.status === "reserved") {
    const { error: updateError } = await admin.from("items").update({ status: "published" }).eq("id", input.itemId);
    if (updateError) throw updateError;
  } else if (input.status === "published") {
    const publishInput = publishItemSchema.safeParse({
      title: item.title,
      description: item.description,
      condition: item.condition ?? "",
      defects: item.defects,
      price: item.price_cents === null ? null : item.price_cents / 100,
      approvedMediaIds: input.approvedMediaIds,
      confirmation: true,
    });
    if (!publishInput.success) {
      throw new ApiError(409, "LISTING_INCOMPLETE", "Completa scheda, prezzo e selezione media prima di pubblicare.");
    }
    await publishItem({ ownerId: item.owner_id, itemId: input.itemId, ...publishInput.data });
  } else {
    const { error: updateError } = await admin.from("items").update({
      status: input.status,
      published_at: input.status === "draft" || input.status === "archived" ? null : item.published_at,
    }).eq("id", input.itemId);
    if (updateError) throw updateError;
  }
  const after = { status: input.status };
  const audit = await recordAudit({
    actorId: input.actorId,
    action: `item.status_${input.status}`,
    targetType: "item",
    targetId: input.itemId,
    reason: input.reason,
    before: { status: item.status },
    after,
    idempotencyKey: input.idempotencyKey,
  });
  return { duplicate: false, audit };
}
