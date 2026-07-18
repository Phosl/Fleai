import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { HUNTING_MONTHLY_LIMIT, SHOP_MONTHLY_LIMIT, type AiRunKind } from "@/lib/contracts";
import type { Database } from "@/lib/supabase/database.types";
import { ApiError } from "@/lib/api/auth";

function monthStartUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function assertQuota(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: AiRunKind,
) {
  const operation = kind === "hunting_report" ? "hunting_report" : "shop_pack";
  const overrideColumn = kind === "hunting_report" ? "hunting_limit_override" : "shop_limit_override";
  const defaultLimit = kind === "hunting_report" ? HUNTING_MONTHLY_LIMIT : SHOP_MONTHLY_LIMIT;
  const [{ count, error: countError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("operation", operation)
      .gte("occurred_at", monthStartUtc()),
    supabase.from("profiles").select("hunting_limit_override,shop_limit_override").eq("id", userId).maybeSingle(),
  ]);
  if (countError) throw countError;
  if (profileError) throw profileError;
  const override = profile?.[overrideColumn];
  const limit = typeof override === "number" ? override : defaultLimit;
  if ((count ?? 0) >= limit) {
    throw new ApiError(429, "MONTHLY_QUOTA_REACHED", "Hai raggiunto la quota gratuita di questo mese.");
  }
  return { used: count ?? 0, limit, operation };
}
