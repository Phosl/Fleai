"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { AiRunKind, AiRunStatus } from "@/lib/contracts";
import {
  advanceAiRunProgress,
  aiRunFailureMessage,
  isAiRunStalled,
  mergeAiRunProgress,
} from "@/lib/ai/run-state";
import { workspaceItemHref } from "@/lib/items/routes";

const labels: Record<AiRunStatus, string> = {
  queued: "Lavoro ricevuto",
  moderating: "Controllo delle immagini",
  inspecting: "Osservo dettagli e condizioni",
  researching: "Cerco comparabili recenti",
  synthesizing: "Calcolo stime e affidabilità",
  generating: "Creo il risultato",
  rendering: "Finalizzo i contenuti",
  needs_input: "Servono altre informazioni",
  completed: "Completato",
  failed: "Elaborazione interrotta",
};

const details: Record<AiRunStatus, string> = {
  queued: "Il lavoro è stato salvato ed è pronto per essere elaborato in background.",
  moderating: "Verifichiamo contenuti e policy prima di proseguire.",
  inspecting: "Il modello rapido analizza le immagini e distingue ciò che vede da ciò che va verificato.",
  researching: "Cerchiamo annunci comparabili recenti nel mercato Italia/UE e conserviamo le fonti.",
  synthesizing: "Rifiniamo stima e affidabilità con le regole prudenziali di Fleai.",
  generating: "Trasformiamo i dati già verificati nel risultato richiesto.",
  rendering: "Prepariamo i file finali e li salviamo nel tuo workspace.",
  needs_input: "Servono altre foto o informazioni per proseguire.",
  completed: "Risultato pronto: verrai reindirizzato automaticamente.",
  failed: "Il lavoro si è fermato senza consumare la quota prevista.",
};

const activityByStatus: Record<AiRunStatus, string[]> = {
  queued: [
    "La richiesta è al sicuro nella coda di Fleai.",
    "Sto preparando il processo in background.",
    "Puoi lasciare aperta questa pagina oppure tornare più tardi.",
  ],
  moderating: [
    "Controllo che le immagini possano essere elaborate.",
    "Verifico il contenuto senza modificare le foto reali.",
  ],
  inspecting: [
    "Leggo forme, materiali, etichette e condizioni visibili.",
    "Confronto le diverse angolazioni dell’oggetto.",
    "Segno separatamente dettagli osservati e aspetti incerti.",
  ],
  researching: [
    "Cerco risultati coerenti con marca, modello e condizioni.",
    "Controllo fonti e date degli annunci trovati.",
    "Distinguo prezzi richiesti, venduti e non verificabili.",
  ],
  synthesizing: [
    "Confronto i prezzi più pertinenti in EUR.",
    "Calcolo una fascia prudente e il livello di affidabilità.",
    "Preparo i controlli utili da fare sull’oggetto.",
  ],
  generating: [
    "Organizzo le informazioni in un risultato modificabile.",
    "Mantengo visibili condizioni, difetti e incertezze.",
    "Controllo che il formato finale sia completo.",
  ],
  rendering: [
    "Preparo i formati finali.",
    "Salvo i contenuti nel tuo workspace.",
  ],
  needs_input: ["In attesa di nuove informazioni."],
  completed: ["Il risultato è pronto."],
  failed: ["L’elaborazione si è fermata."],
};

const activityByKind: Partial<Record<AiRunKind, Partial<Record<AiRunStatus, string[]>>>> = {
  listing_draft: {
    generating: [
      "Scrivo un titolo chiaro e una descrizione accurata.",
      "Preparo la scheda copiabile per Vinted.",
      "Compongo condizioni, difetti, prezzo e testi social.",
      "Valido tutti i campi prima di mostrarti la bozza.",
    ],
  },
  marketing_images: {
    generating: [
      "Preparo la hero mantenendo riconoscibile l’oggetto.",
      "Creo una scena contestualizzata separata dalle foto reali.",
      "Applico il badge Visualizzazione AI agli asset generati.",
    ],
  },
  social_pack: {
    generating: [
      "Adatto testi e immagini ai formati social.",
      "Preparo caption e hashtag copiabili.",
    ],
    rendering: [
      "Finalizzo i contenuti social.",
      "Salvo i file pronti da scaricare.",
    ],
  },
};

type RunPollResult = {
  status: AiRunStatus;
  progress: number;
  reportId?: string;
  kind: AiRunKind;
  item_id: string;
  error_code?: string | null;
  attempt_count?: number;
  updated_at: string;
};

function statusLabel(status: AiRunStatus, kind: AiRunKind | null) {
  if (status === "generating" && kind === "listing_draft") return "Creo la scheda annuncio";
  if (status === "generating" && kind === "marketing_images") return "Creo i visual";
  if (status === "generating" && kind === "social_pack") return "Creo i contenuti social";
  return labels[status];
}

function statusDetail(status: AiRunStatus, kind: AiRunKind | null) {
  if (status === "generating" && kind === "listing_draft") {
    return "Trasformiamo il report già verificato in titolo, descrizione, condizioni e contenuti copiabili.";
  }
  if (status === "generating" && kind === "marketing_images") {
    return "Generiamo asset di presentazione separati dalle foto reali delle condizioni.";
  }
  return details[status];
}

function activityMessage(kind: AiRunKind | null, status: AiRunStatus, elapsedSeconds: number) {
  const messages = (kind && activityByKind[kind]?.[status]) || activityByStatus[status];
  return messages[Math.floor(elapsedSeconds / 4) % messages.length];
}

function formatElapsed(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function lastCheckLabel(lastCheckedAt: number | null) {
  if (!lastCheckedAt) return "Connessione al server…";
  const seconds = Math.max(0, Math.floor((Date.now() - lastCheckedAt) / 1000));
  return seconds < 2 ? "Server contattato ora" : `Server contattato ${seconds}s fa`;
}

export function RunProgress({ runId, initialStatus = "queued" }: { runId: string; initialStatus?: AiRunStatus }) {
  const router = useRouter();
  const [kind, setKind] = useState<AiRunKind | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(5);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [connectionIssue, setConnectionIssue] = useState("");
  const [recovery, setRecovery] = useState<{ itemId: string; kind: AiRunKind } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
      if (!recovery) setProgress((current) => advanceAiRunProgress(current, status));
    }, 1000);
    return () => clearInterval(interval);
  }, [recovery, status]);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/ai/runs/${runId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Stato non disponibile");
        const run = await response.json() as RunPollResult;
        if (!active) return;
        setKind(run.kind);
        setStatus(run.status);
        setProgress((current) => mergeAiRunProgress(current, run.status, run.progress));
        setLastCheckedAt(Date.now());
        setConnectionIssue("");
        if (run.status === "completed") {
          router.replace(run.reportId ? `/app/hunt/${run.reportId}` : `/app/items/new?item=${run.item_id}`);
          return;
        }
        if (isAiRunStalled(run)) {
          setRecovery({ itemId: run.item_id, kind: run.kind });
          setError(aiRunFailureMessage(run.kind, run.error_code));
          return;
        }
        if (run.status === "needs_input" || run.status === "failed") {
          setRecovery({ itemId: run.item_id, kind: run.kind });
          setError(aiRunFailureMessage(run.kind, run.error_code));
          return;
        }
        timeout = setTimeout(poll, run.status === "queued" ? 2500 : 4000);
      } catch {
        if (active) {
          setConnectionIssue("Connessione instabile: continuo a riconnettermi senza interrompere il lavoro.");
          timeout = setTimeout(poll, 5000);
        }
      }
    }
    void poll();
    return () => { active = false; clearTimeout(timeout); };
  }, [router, runId]);

  const displayStatus = recovery && status === "queued" ? "failed" : status;
  const isWorking = !recovery && !["failed", "needs_input", "completed"].includes(status);
  const progressLabel = Math.round(progress);
  const messages = activityMessage(kind, status, elapsedSeconds);
  const recoveryHref = recovery ? workspaceItemHref(recovery.itemId) : null;
  const recoveryLabel = recovery?.kind === "hunting_report"
    ? "Apri l’oggetto e riprova"
    : "Apri l’oggetto";

  return (
    <div className="form-card run-progress-card">
      {isWorking && <div className="spinner run-progress-spinner" aria-hidden="true" />}
      <span className="eyebrow">Lavorazione AI</span>
      <h1 className="subtitle run-progress-title">{statusLabel(displayStatus, kind)}</h1>
      <p className="muted run-progress-detail">{statusDetail(displayStatus, kind)}</p>

      {isWorking && (
        <div className={`run-live-panel ${connectionIssue ? "run-live-reconnecting" : ""}`}>
          <span className="run-live-dot" aria-hidden="true" />
          <span className="run-live-copy">
            <strong>{connectionIssue ? "Riconnessione in corso" : "Elaborazione attiva"}</strong>
            <span>{connectionIssue || messages}</span>
          </span>
        </div>
      )}

      <p className="muted run-background-note">Puoi chiudere questa pagina: il lavoro continua e lo ritroverai nel dashboard.</p>
      <div
        className="progress-bar run-progress-track"
        role="progressbar"
        aria-label="Avanzamento elaborazione"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressLabel}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="run-progress-meta" aria-label="Dettagli elaborazione">
        <strong>{progressLabel}%</strong>
        <span>Tempo {formatElapsed(elapsedSeconds)}</span>
        <span>{lastCheckLabel(lastCheckedAt)}</span>
      </div>
      <p className="mono muted run-id">run {runId.slice(0, 8)}</p>

      {connectionIssue && <p role="status" className="run-connection-message">Il server continua il lavoro anche se il telefono perde momentaneamente la rete.</p>}
      {error && <p role="alert" className="run-error-message">{error}</p>}
      {recoveryHref && (
        <Link className="button button-coral" href={recoveryHref} style={{ marginTop: 16 }}>
          <RotateCcw size={17} /> {recoveryLabel}
        </Link>
      )}
    </div>
  );
}
