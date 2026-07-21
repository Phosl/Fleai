"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { AiRunKind, AiRunStatus } from "@/lib/contracts";
import { aiRunFailureMessage, isAiRunStalled } from "@/lib/ai/run-state";

const labels: Record<AiRunStatus, string> = {
  queued: "In coda",
  moderating: "Controllo delle immagini",
  inspecting: "Osservo dettagli e condizioni",
  researching: "Cerco comparabili recenti",
  synthesizing: "Calcolo stime e affidabilità",
  generating: "Creo la scheda annuncio",
  rendering: "Renderizzo il video sociale",
  needs_input: "Servono altre informazioni",
  completed: "Completato",
  failed: "Analisi non riuscita",
};

const details: Record<AiRunStatus, string> = {
  queued: "Prepariamo il lavoro in background. Puoi chiudere la pagina.",
  moderating: "Verifichiamo contenuti e policy con moderazione AI.",
  inspecting: "Il modello rapido analizza le immagini e capisce il tipo di oggetto.",
  researching: "Cerchiamo annunci comparabili recenti nel mercato Italia/UE e li citiamo.",
  synthesizing: "Rifiniamo stima e affidabilità con regole prudenziali.",
  generating: "Trasformiamo il report già verificato in titolo, descrizione, condizioni e contenuti copiabili.",
  rendering: "Generiamo i contenuti multimediali di presentazione.",
  needs_input: "Servono altre foto o informazioni per proseguire.",
  completed: "Risultato pronto: verrai reindirizzato alla scheda.",
  failed: "La ricerca non è riuscita. Controlla i dati e riprova.",
};

export function RunProgress({ runId, initialStatus = "queued" }: { runId: string; initialStatus?: AiRunStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<{ itemId: string; kind: AiRunKind } | null>(null);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/ai/runs/${runId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Stato non disponibile");
        const run = await response.json() as {
          status: AiRunStatus;
          progress: number;
          reportId?: string;
          kind: AiRunKind;
          item_id: string;
          error_code?: string | null;
          attempt_count?: number;
          updated_at: string;
        };
        if (!active) return;
        setStatus(run.status); setProgress(run.progress);
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
      } catch { if (active) { setError("Connessione interrotta. Riprovo automaticamente…"); timeout = setTimeout(poll, 5000); } }
    }
    void poll();
    return () => { active = false; clearTimeout(timeout); };
  }, [router, runId]);

  return (
    <div className="form-card" style={{ maxWidth: 620, margin: "10vh auto", textAlign: "center" }}>
      {status !== "failed" && status !== "needs_input" && !recovery && <div className="spinner" style={{ width: 46, height: 46, margin: "0 auto 24px", borderWidth: 4 }} />}
      <span className="eyebrow">Lavorazione AI</span>
      <h1 className="subtitle" style={{ margin: "18px 0 10px" }}>{labels[status]}</h1>
      <p className="muted">{details[status]}</p>
      <p className="muted">Puoi chiudere questa pagina: il lavoro continua e lo ritroverai nel dashboard.</p>
      <div className="progress-bar" style={{ marginTop: 24, height: 12 }}><span style={{ width: `${progress}%`, transition: "width .35s" }} /></div>
      <p className="mono muted" style={{ fontSize: 11 }}>{progress}% · run {runId.slice(0, 8)}</p>
      {error && <p role="status" style={{ color: status === "failed" || recovery ? "var(--danger)" : "var(--muted)", fontSize: 13 }}>{error}</p>}
      {recovery?.kind === "listing_draft" && (
        <Link className="button button-coral" href={`/app/items/new?item=${recovery.itemId}`} style={{ marginTop: 16 }}>
          <RotateCcw size={17} /> Riprova la scheda
        </Link>
      )}
    </div>
  );
}
