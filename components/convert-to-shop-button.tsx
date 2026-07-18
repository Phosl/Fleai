"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { startAiRun } from "@/lib/api/ai-runs-client";

export function ConvertToShopButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function convert() {
    setBusy(true); setError("");
    try {
      const { runId } = await startAiRun({ itemId, kind: "listing_draft" });
      router.push(`/app/runs/${runId}`);
    } catch (cause) {
      setBusy(false); setError(cause instanceof Error ? cause.message : "Operazione non riuscita.");
    }
  }

  return <div><button type="button" className="button button-lime button-wide" onClick={() => void convert()} disabled={busy}>{busy ? <><span className="spinner" /> Creo la bozza…</> : <>Trasforma in annuncio <ArrowRight size={18} /></>}</button>{error && <p role="alert" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}</div>;
}
