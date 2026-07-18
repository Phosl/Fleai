"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) {
    throw new Error("Supabase non configurato");
  }
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  );
}
