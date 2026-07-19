import "server-only";

import { z } from "zod";
import { ApiError } from "@/lib/api/auth";
import { adminDatabaseMessage, isMissingSchemaError } from "@/lib/database-errors";

export function adminIdempotencyKey(request: Request) {
  return z.string().uuid().parse(request.headers.get("idempotency-key"));
}

export function adminApiErrorResponse(cause: unknown) {
  if (cause instanceof z.ZodError) {
    return Response.json({ error: "INVALID_INPUT", message: "Controlla i campi inseriti e riprova." }, { status: 400 });
  }
  if (cause instanceof ApiError) {
    return Response.json({ error: cause.code, message: cause.message }, { status: cause.status });
  }
  if (isMissingSchemaError(cause && typeof cause === "object" ? cause as never : null)) {
    return Response.json({ error: "ADMIN_SCHEMA_REQUIRED", message: adminDatabaseMessage(cause as never) }, { status: 503 });
  }
  const shape = cause && typeof cause === "object" ? cause as { code?: string; name?: string } : {};
  console.error(JSON.stringify({ scope: "admin_api", code: shape.code ?? "UNKNOWN", error: shape.name ?? "unknown" }));
  return Response.json({ error: "ADMIN_OPERATION_FAILED", message: "Operazione amministrativa non completata. Riprova." }, { status: 500 });
}
