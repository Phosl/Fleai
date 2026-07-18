import type { AiRunKind, CreateAiRunInput } from "@/lib/contracts";

export async function startAiRun(input: {
  itemId: string;
  kind: AiRunKind;
  runInput?: CreateAiRunInput["input"];
}) {
  const response = await fetch("/api/ai/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      itemId: input.itemId,
      kind: input.kind,
      idempotencyKey: crypto.randomUUID(),
      input: input.runInput ?? {},
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Generazione non disponibile.");
  }
  return response.json() as Promise<{ runId: string; status: string }>;
}
