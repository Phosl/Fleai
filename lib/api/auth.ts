import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/database-errors";

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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("suspended_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError && !isMissingSchemaError(profileError)) throw profileError;
  if (profileError && isMissingSchemaError(profileError)) {
    console.warn(JSON.stringify({ scope: "auth", operation: "suspension_check", resource: "profiles", code: profileError.code }));
  }
  if (profile?.suspended_at) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Il tuo account è sospeso. Contatta l'assistenza Fleai.");
  }
  return { supabase, user: data.user };
}

export function isAdmin(user: User) {
  return user.app_metadata?.role === "admin";
}

export async function requireAdmin() {
  const context = await requireUser();
  if (!isAdmin(context.user)) {
    throw new ApiError(403, "ADMIN_REQUIRED", "Non hai accesso al pannello Super Admin.");
  }
  return context;
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
