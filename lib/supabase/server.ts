import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) {
    throw new Error("Supabase non configurato");
  }

  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always mutate cookies; proxy.ts refreshes sessions.
          }
        },
      },
    },
  );
}
