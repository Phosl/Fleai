export type DatabaseError = {
  code?: string;
  message?: string;
  details?: string | null;
};

const missingSchemaCodes = new Set([
  "42P01",
  "42703",
  "42883",
  "PGRST200",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

export function isMissingSchemaError(error: DatabaseError | null | undefined) {
  if (!error) return false;
  if (error.code && missingSchemaCodes.has(error.code)) return true;
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return /schema cache|does not exist|could not find (the )?(table|function|column)/.test(message);
}

export function publicDatabaseMessage(error: DatabaseError | null | undefined) {
  if (isMissingSchemaError(error)) {
    return "Questa funzione non è disponibile in questo momento. Riprova tra poco.";
  }
  if (error?.code === "42501") {
    return "Non hai i permessi necessari per completare questa operazione.";
  }
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}

export function adminDatabaseMessage(error: DatabaseError | null | undefined) {
  if (isMissingSchemaError(error)) {
    return "Lo schema Supabase non è aggiornato. Applica le migrazioni e ricarica.";
  }
  return publicDatabaseMessage(error);
}
