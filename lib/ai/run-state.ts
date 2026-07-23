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

const progressFloor: Record<AiRunStatus, number> = {
  queued: 5,
  moderating: 10,
  inspecting: 30,
  researching: 55,
  synthesizing: 75,
  generating: 30,
  rendering: 88,
  needs_input: 100,
  completed: 100,
  failed: 100,
};

const optimisticProgressCap: Record<AiRunStatus, number> = {
  queued: 9,
  moderating: 24,
  inspecting: 50,
  researching: 72,
  synthesizing: 94,
  generating: 86,
  rendering: 97,
  needs_input: 100,
  completed: 100,
  failed: 100,
};

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

export function mergeAiRunProgress(current: number, status: AiRunStatus, reported: number) {
  const safeCurrent = Math.max(0, Math.min(100, current));
  const safeReported = Number.isFinite(reported) ? Math.max(0, Math.min(100, reported)) : 0;
  return Math.max(safeCurrent, safeReported, progressFloor[status]);
}

export function advanceAiRunProgress(current: number, status: AiRunStatus) {
  const cap = optimisticProgressCap[status];
  if (!activeStatuses.has(status) || current >= cap) return current;
  const distance = cap - current;
  const increment = Math.max(0.2, Math.min(0.8, distance * 0.04));
  return Math.round(Math.min(cap, current + increment) * 10) / 10;
}

export function aiRunFailureMessage(kind: AiRunKind, errorCode?: string | null) {
  if (errorCode === "HUNTING_REPORT_REQUIRED") return "Completa prima il report Hunting dell’oggetto.";
  if (errorCode === "NEEDS_PHOTOS") return "Servono almeno una foto reale per continuare.";
  if (errorCode === "CONTENT_BLOCKED" || errorCode === "PROHIBITED_ITEM") {
    return "Questo oggetto non può essere elaborato da Fleai.";
  }
  if (errorCode === "ACCOUNT_SUSPENDED") return "L’account è sospeso. Contatta l’assistenza.";
  if (errorCode === "PROVIDER_INVALID_INPUT") {
    return "Il provider non ha accettato il formato delle immagini. Le foto restano salvate: apri l’oggetto e riprova.";
  }
  if (kind === "listing_draft") return "La bozza dell’annuncio non è stata completata. Puoi riprovare senza perdere foto e report.";
  return "L’elaborazione non è stata completata. La quota non è stata consumata.";
}
