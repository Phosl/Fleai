"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { AiRunKind } from "@/lib/contracts";
import { startAiRun } from "@/lib/api/ai-runs-client";

export function StartItemRunButton({
  itemId,
  kind,
  label,
  busyLabel,
  className = "button button-lime button-wide",
}: {
  itemId: string;
  kind: AiRunKind;
  label: string;
  busyLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const { runId } = await startAiRun({ itemId, kind });
      router.push(`/app/runs/${runId}`);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Operazione non riuscita.");
    }
  }

  return (
    <div>
      <button type="button" className={className} onClick={() => void start()} disabled={busy}>
        {busy ? <><span className="spinner" /> {busyLabel}</> : <>{label} <ArrowRight size={18} /></>}
      </button>
      {error && <p role="alert" className="run-action-error">{error}</p>}
    </div>
  );
}
