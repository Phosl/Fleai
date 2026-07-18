import { after } from "next/server";
import { createAiRunSchema } from "@/lib/contracts";
import { apiErrorResponse, requireUser } from "@/lib/api/auth";
import { requireOwnedItem } from "@/lib/api/ownership";
import { assertQuota } from "@/lib/ai/quota";
import type { Json } from "@/lib/supabase/database.types";
import { logWorkerTriggerFailure, triggerAiWorker } from "@/lib/ai/worker-trigger";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = createAiRunSchema.parse(await request.json());
    await requireOwnedItem(supabase, user.id, input.itemId);

    const { data: existing, error: existingError } = await supabase
      .from("analysis_runs")
      .select("id,status")
      .eq("owner_id", user.id)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return Response.json({ runId: existing.id, status: existing.status });

    if (input.kind === "hunting_report" || input.kind === "listing_draft") {
      await assertQuota(supabase, user.id, input.kind);
    }
    const { data: run, error: runError } = await supabase
      .from("analysis_runs")
      .insert({
        owner_id: user.id,
        item_id: input.itemId,
        kind: input.kind,
        idempotency_key: input.idempotencyKey,
        input: input.input as Json,
      })
      .select("id,status")
      .single();
    if (runError) throw runError;
    const { error: queueError } = await supabase.rpc("enqueue_ai_run", { run_id: run.id });
    if (queueError) throw queueError;
    after(async () => {
      try {
        await triggerAiWorker();
      } catch (cause) {
        logWorkerTriggerFailure(cause);
      }
    });
    return Response.json({ runId: run.id, status: run.status }, { status: 202 });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}
