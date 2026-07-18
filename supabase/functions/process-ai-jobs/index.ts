import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { shouldDeleteQueueMessage } from "../_shared/retry-policy.ts";

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: { run_id?: string };
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL");
  const workerSecret = Deno.env.get("INTERNAL_WORKER_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !appUrl || !workerSecret) {
    return Response.json({ error: "WORKER_ENV_MISSING" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("read_ai_jobs", { batch_size: 5 });
  if (error) return Response.json({ error: "QUEUE_READ_FAILED" }, { status: 500 });

  let completed = 0;
  let retained = 0;
  for (const job of (data ?? []) as QueueMessage[]) {
    const runId = job.message?.run_id;
    if (!runId) {
      await supabase.rpc("delete_ai_job", { message_id: job.msg_id });
      continue;
    }
    try {
      const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/process-run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({ runId }),
      });
      if (shouldDeleteQueueMessage(response.status)) {
        await supabase.rpc("delete_ai_job", { message_id: job.msg_id });
        completed += 1;
      } else {
        retained += 1;
      }
    } catch {
      retained += 1;
    }
  }

  return Response.json({ received: data?.length ?? 0, completed, retained });
});
