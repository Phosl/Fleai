import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "UNAUTHORIZED", "Accedi per continuare.");
  return { supabase, user: data.user };
}

export function isAdmin(user: User) {
  return user.app_metadata?.role === "admin";
}

export function apiErrorResponse(cause: unknown) {
  if (cause instanceof ApiError) {
    return Response.json({ error: cause.code, message: cause.message }, { status: cause.status });
  }
  console.error("Fleai API error", cause instanceof Error ? { name: cause.name, message: cause.message } : cause);
  return Response.json(
    { error: "INTERNAL_ERROR", message: "Qualcosa non ha funzionato. Riprova tra poco." },
    { status: 500 },
  );
}
