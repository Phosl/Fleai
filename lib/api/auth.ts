import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/database-errors";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type AccessProfile = {
  display_name: string;
  suspended_at: string | null;
  is_super_admin: boolean;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readUserAccessProfile(supabase: ServerSupabaseClient, userId: string): Promise<{
  profile: AccessProfile | null;
  adminSchemaMissing: boolean;
  isSuspended: boolean;
}> {
  const [current, suspension] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,suspended_at,is_super_admin")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("is_suspended", {}),
  ]);
  if (suspension.error && !isMissingSchemaError(suspension.error)) throw suspension.error;

  if (!current.error) {
    return {
      profile: current.data,
      adminSchemaMissing: false,
      isSuspended: suspension.error ? Boolean(current.data?.suspended_at) : Boolean(suspension.data),
    };
  }
  if (!isMissingSchemaError(current.error)) throw current.error;

  console.warn(JSON.stringify({
    scope: "auth",
    operation: "access_profile",
    resource: "profiles.is_super_admin",
    code: current.error.code,
  }));

  const fallback = await supabase
    .from("profiles")
    .select("display_name,suspended_at")
    .eq("id", userId)
    .maybeSingle();
  if (fallback.error && !isMissingSchemaError(fallback.error)) throw fallback.error;
  return {
    profile: fallback.data ? { ...fallback.data, is_super_admin: false } : null,
    adminSchemaMissing: true,
    isSuspended: suspension.error ? Boolean(fallback.data?.suspended_at) : Boolean(suspension.data),
  };
}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "UNAUTHORIZED", "Accedi per continuare.");
  const access = await readUserAccessProfile(supabase, data.user.id);
  if (access.isSuspended) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Il tuo account è sospeso. Contatta l'assistenza Fleai.");
  }
  return { supabase, user: data.user, ...access };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.adminSchemaMissing) {
    throw new ApiError(503, "ADMIN_SCHEMA_REQUIRED", "Applica la migrazione Super Admin più recente e ricarica la pagina.");
  }
  if (!context.profile?.is_super_admin) {
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
