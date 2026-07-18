export type ProviderErrorClass = "configuration" | "rate_limit" | "timeout" | "content" | "invalid_output" | "unknown";

type ProviderErrorShape = {
  status?: unknown;
  code?: unknown;
  request_id?: unknown;
};

function providerErrorShape(cause: unknown): ProviderErrorShape {
  return cause && typeof cause === "object" ? cause as ProviderErrorShape : {};
}

export function classifyProviderError(cause: unknown): ProviderErrorClass {
  const shape = providerErrorShape(cause);
  if (shape.status === 401 || shape.status === 403) return "configuration";
  if (shape.status === 429) return "rate_limit";
  if (shape.status === 408 || shape.status === 504) return "timeout";
  const message = (cause instanceof Error ? cause.message : String(cause)).toLowerCase();
  if (message.includes("api_key") || message.includes("api key") || message.includes("not_configured") || message.includes("env_missing")) return "configuration";
  if (message.includes("rate") || message.includes("429")) return "rate_limit";
  if (message.includes("timeout") || message.includes("timed out")) return "timeout";
  if (message.includes("blocked") || message.includes("prohibited") || message.includes("moderation")) return "content";
  if (message.includes("invalid") || message.includes("empty")) return "invalid_output";
  return "unknown";
}

export function providerErrorMetadata(cause: unknown) {
  const shape = providerErrorShape(cause);
  return {
    providerStatus: typeof shape.status === "number" ? shape.status : null,
    providerCode: typeof shape.code === "string" ? shape.code.slice(0, 80) : null,
    providerRequestId: typeof shape.request_id === "string" ? shape.request_id.slice(0, 120) : null,
  };
}

export function providerErrorCode(cause: unknown) {
  const classification = classifyProviderError(cause);
  const codes: Record<ProviderErrorClass, string> = {
    configuration: "PROVIDER_NOT_CONFIGURED",
    rate_limit: "PROVIDER_RATE_LIMIT",
    timeout: "PROVIDER_TIMEOUT",
    content: "PROVIDER_CONTENT_BLOCKED",
    invalid_output: "PROVIDER_INVALID_OUTPUT",
    unknown: "PROVIDER_ERROR",
  };
  return codes[classification];
}
