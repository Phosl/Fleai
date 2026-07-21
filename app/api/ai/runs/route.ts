import { after } from "next/server";
import { createAiRunSchema } from "@/lib/contracts";
import { apiErrorResponse, requireUser } from "@/lib/api/auth";
import { requireOwnedItem } from "@/lib/api/ownership";
import { assertQuota } from "@/lib/ai/quota";
import type { Json } from "@/lib/supabase/database.types";
import { logWorkerTriggerFailure, triggerAiWorker } from "@/lib/ai/worker-trigger";
import { isAiRunStalled } from "@/lib/ai/run-state";
import { createAdminClient } from "@/lib/supabase/admin";

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

    if (input.kind === "listing_draft") {
      const { data: previousRuns, error: previousError } = await supabase
        .from("analysis_runs")
        .select("id,status,error_code,attempt_count,updated_at")
        .eq("owner_id", user.id)
        .eq("item_id", input.itemId)
        .eq("kind", input.kind)
        .in("status", ["queued", "moderating", "inspecting", "researching", "synthesizing", "generating", "rendering"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (previousError) throw previousError;
      const previous = previousRuns?.[0];
      if (previous && !isAiRunStalled(previous)) {
        return Response.json({ runId: previous.id, status: previous.status }, { status: 202 });
      }
      if (previous) {
        const { error: supersedeError } = await createAdminClient()
          .from("analysis_runs")
          .update({
            status: "failed",
            progress: 100,
            error_code: "SUPERSEDED_BY_RETRY",
            completed_at: new Date().toISOString(),
          })
          .eq("id", previous.id)
          .eq("owner_id", user.id)
          .eq("status", "queued");
        if (supersedeError) throw supersedeError;
      }
    }

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
