import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error("Supabase service role non configurato");
  }
  return createClient<Database>(
    serverEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
