import { processAnalysisRun, RunProcessingError } from "@/lib/ai/process-run";
import { serverEnv } from "@/lib/env/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!serverEnv.internalWorkerSecret || authorization !== `Bearer ${serverEnv.internalWorkerSecret}`) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { runId?: string } | null;
  if (!body?.runId) return Response.json({ error: "RUN_ID_REQUIRED" }, { status: 400 });
  try {
    const result = await processAnalysisRun(body.runId);
    return Response.json({ ok: true, result });
  } catch (cause) {
    if (cause instanceof RunProcessingError) {
      return Response.json({ error: cause.message, terminal: cause.terminal }, { status: cause.terminal ? 422 : 503 });
    }
    return Response.json({ error: "WORKER_ERROR" }, { status: 500 });
  }
}
