import type { AiRunKind, AiRunStatus } from "@/lib/contracts";

const activeStatuses = new Set<AiRunStatus>([
  "queued",
  "moderating",
  "inspecting",
  "researching",
  "synthesizing",
  "generating",
  "rendering",
]);

export const RUN_STALLED_AFTER_MS = 90_000;

type RunState = {
  status: AiRunStatus;
  error_code?: string | null;
  attempt_count?: number;
  updated_at?: string;
};

export function isAiRunStalled(run: RunState, now = Date.now()) {
  if (run.status !== "queued" || !run.updated_at) return false;
  const updatedAt = Date.parse(run.updated_at);
  if (!Number.isFinite(updatedAt) || now - updatedAt < RUN_STALLED_AFTER_MS) return false;
  return Boolean(run.error_code) || (run.attempt_count ?? 0) > 0 || now - updatedAt >= RUN_STALLED_AFTER_MS * 2;
}

export function isAiRunActive(run: RunState, now = Date.now()) {
  return activeStatuses.has(run.status) && !isAiRunStalled(run, now);
}

export function aiRunFailureMessage(kind: AiRunKind, errorCode?: string | null) {
  if (errorCode === "HUNTING_REPORT_REQUIRED") return "Completa prima il report Hunting dell’oggetto.";
  if (errorCode === "NEEDS_PHOTOS") return "Servono almeno una foto reale per continuare.";
  if (errorCode === "CONTENT_BLOCKED" || errorCode === "PROHIBITED_ITEM") {
    return "Questo oggetto non può essere elaborato da Fleai.";
  }
  if (errorCode === "ACCOUNT_SUSPENDED") return "L’account è sospeso. Contatta l’assistenza.";
  if (kind === "listing_draft") return "La bozza dell’annuncio non è stata completata. Puoi riprovare senza perdere foto e report.";
  return "L’elaborazione non è stata completata. La quota non è stata consumata.";
}
