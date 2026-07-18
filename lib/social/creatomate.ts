import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env/server";

type RenderMetadata = { packId: string; signature: string };

function signature(packId: string) {
  if (!serverEnv.creatomateWebhookSecret) throw new Error("CREATOMATE_WEBHOOK_SECRET_MISSING");
  return createHmac("sha256", serverEnv.creatomateWebhookSecret).update(packId).digest("hex");
}

export function makeRenderMetadata(packId: string) {
  return JSON.stringify({ packId, signature: signature(packId) } satisfies RenderMetadata);
}

export function verifyRenderMetadata(value: unknown): RenderMetadata | null {
  try {
    const parsed = (typeof value === "string" ? JSON.parse(value) : value) as Partial<RenderMetadata>;
    if (!parsed.packId || !parsed.signature) return null;
    const expected = Buffer.from(signature(parsed.packId), "hex");
    const received = Buffer.from(parsed.signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    return { packId: parsed.packId, signature: parsed.signature };
  } catch {
    return null;
  }
}

export async function createSocialRender(input: {
  packId: string;
  title: string;
  priceLabel: string;
  imageUrls: string[];
}) {
  if (!serverEnv.creatomateApiKey || !serverEnv.creatomateTemplateId) throw new Error("CREATOMATE_NOT_CONFIGURED");
  const response = await fetch("https://api.creatomate.com/v2/renders", {
    method: "POST",
    headers: {
      authorization: `Bearer ${serverEnv.creatomateApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      template_id: serverEnv.creatomateTemplateId,
      modifications: {
        "Title": input.title,
        "Price": input.priceLabel,
        "Image-1": input.imageUrls[0],
        "Image-2": input.imageUrls[1] ?? input.imageUrls[0],
        "Image-3": input.imageUrls[2] ?? input.imageUrls[0],
      },
      webhook_url: `${serverEnv.appUrl.replace(/\/$/, "")}/api/webhooks/creatomate`,
      metadata: makeRenderMetadata(input.packId),
      max_width: 1080,
      max_height: 1920,
    }),
  });
  if (!response.ok) throw new Error(`CREATOMATE_${response.status}`);
  const payload = await response.json() as { id?: string; status?: string } | Array<{ id?: string; status?: string }>;
  const render = Array.isArray(payload) ? payload[0] : payload;
  if (!render?.id) throw new Error("CREATOMATE_INVALID_RESPONSE");
  return { id: render.id, status: render.status ?? "planned" };
}
