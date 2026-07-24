import "server-only";

import { publicEnv } from "@/lib/env/public";
import { absoluteUrl } from "@/lib/seo";

export const serverEnv = {
  ...publicEnv,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiFastModel: process.env.OPENAI_FAST_MODEL ?? "gpt-5.6-luna",
  openAiAnalysisModel: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5.6-terra",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2-2026-04-21",
  creatomateApiKey: process.env.CREATOMATE_API_KEY,
  creatomateTemplateId: process.env.CREATOMATE_TEMPLATE_ID,
  creatomateWebhookSecret: process.env.CREATOMATE_WEBHOOK_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "Fleai <info@voxels.it>",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
  internalWorkerSecret: process.env.INTERNAL_WORKER_SECRET,
  appUrl: absoluteUrl("/"),
};

export const isDemoMode = !(
  serverEnv.supabaseUrl &&
  serverEnv.supabasePublishableKey &&
  serverEnv.supabaseServiceRoleKey
);
