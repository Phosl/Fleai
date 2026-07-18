import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ApiError } from "@/lib/api/auth";

export async function requireOwnedItem(
  supabase: SupabaseClient<Database>,
  userId: string,
  itemId: string,
) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "ITEM_NOT_FOUND", "Oggetto non trovato.");
  return data;
}
