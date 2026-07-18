import "server-only";

import { serverEnv } from "@/lib/env/server";

export async function triggerAiWorker() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabasePublishableKey) {
    throw new Error("AI_WORKER_TRIGGER_NOT_CONFIGURED");
  }

  const response = await fetch(
    `${serverEnv.supabaseUrl.replace(/\/$/, "")}/functions/v1/process-ai-jobs`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${serverEnv.supabasePublishableKey}`,
        apikey: serverEnv.supabasePublishableKey,
        "content-type": "application/json",
      },
      body: "{}",
    },
  );

  if (!response.ok) {
    throw new Error(`AI_WORKER_TRIGGER_${response.status}`);
  }
}

export function logWorkerTriggerFailure(cause: unknown) {
  const status = cause instanceof Error
    ? cause.message.match(/^AI_WORKER_TRIGGER_(\d{3})$/)?.[1] ?? null
    : null;
  console.error(JSON.stringify({
    scope: "ai_worker_trigger",
    event: "trigger_failed",
    status: status ? Number(status) : null,
  }));
}
