"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiRunStatus } from "@/lib/contracts";

const labels: Record<AiRunStatus, string> = {
  queued: "In coda",
  moderating: "Controllo delle immagini",
  inspecting: "Osservo dettagli e condizioni",
  researching: "Cerco comparabili recenti",
  synthesizing: "Calcolo stime e affidabilità",
  generating: "Creo gli asset",
  rendering: "Renderizzo il video sociale",
  needs_input: "Servono altre informazioni",
  completed: "Completato",
  failed: "Analisi non riuscita",
};

export function RunProgress({ runId, initialStatus = "queued" }: { runId: string; initialStatus?: AiRunStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/ai/runs/${runId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Stato non disponibile");
        const run = await response.json() as { status: AiRunStatus; progress: number; reportId?: string; kind: string; item_id: string };
        if (!active) return;
        setStatus(run.status); setProgress(run.progress);
        if (run.status === "completed") {
          router.replace(run.reportId ? `/app/hunt/${run.reportId}` : `/app/items/new?item=${run.item_id}`);
          return;
        }
        if (run.status === "needs_input") { setError("Servono altre foto o informazioni per continuare. La quota non è stata consumata."); return; }
        if (run.status === "failed") { setError("La ricerca non è stata completata. La quota non è stata consumata."); return; }
        timeout = setTimeout(poll, run.status === "queued" ? 2500 : 4000);
      } catch { if (active) { setError("Connessione interrotta. Riprovo automaticamente…"); timeout = setTimeout(poll, 5000); } }
    }
    void poll();
    return () => { active = false; clearTimeout(timeout); };
  }, [router, runId]);

  return (
    <div className="form-card" style={{ maxWidth: 620, margin: "10vh auto", textAlign: "center" }}>
      {status !== "failed" && status !== "needs_input" && <div className="spinner" style={{ width: 46, height: 46, margin: "0 auto 24px", borderWidth: 4 }} />}
      <span className="eyebrow">Ricerca in corso</span>
      <h1 className="subtitle" style={{ margin: "18px 0 10px" }}>{labels[status]}</h1>
      <p className="muted">Puoi chiudere questa pagina: il lavoro continua e lo ritroverai nel dashboard.</p>
      <div className="progress-bar" style={{ marginTop: 24, height: 12 }}><span style={{ width: `${progress}%`, transition: "width .35s" }} /></div>
      <p className="mono muted" style={{ fontSize: 11 }}>{progress}% · run {runId.slice(0, 8)}</p>
      {error && <p role="status" style={{ color: status === "failed" ? "var(--danger)" : "var(--muted)", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
