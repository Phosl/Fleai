import { describe, expect, it } from "vitest";
import { classifyProviderError, providerErrorCode, providerErrorMetadata } from "@/lib/ai/provider-errors";
import { adminDatabaseMessage, isMissingSchemaError, publicDatabaseMessage } from "@/lib/database-errors";

describe("classificazione errori", () => {
  it.each([
    [new Error("429 rate limit"), "rate_limit"],
    [new Error("request timeout"), "timeout"],
    [new Error("OPENAI_API_KEY_MISSING"), "configuration"],
    [new Error("CONTENT_BLOCKED"), "content"],
    [new Error("OPENAI_IMAGE_EMPTY"), "invalid_output"],
  ] as const)("classifica provider senza esporre messaggi grezzi", (error, expected) => {
    expect(classifyProviderError(error)).toBe(expected);
    expect(providerErrorCode(error)).toMatch(/^PROVIDER_/);
  });

  it("classifica gli status provider e conserva solo metadati diagnostici sicuri", () => {
    const cause = { status: 401, code: "invalid_api_key", request_id: "req_123", secret: "non-loggare" };
    expect(classifyProviderError(cause)).toBe("configuration");
    expect(providerErrorMetadata(cause)).toEqual({
      providerStatus: 401,
      providerCode: "invalid_api_key",
      providerRequestId: "req_123",
    });
  });

  it("distingue schema mancante e privilegi insufficienti", () => {
    expect(isMissingSchemaError({ code: "42P01" })).toBe(true);
    expect(adminDatabaseMessage({ code: "42P01" })).toContain("migrazioni");
    expect(publicDatabaseMessage({ code: "42P01" })).not.toContain("schema");
    expect(publicDatabaseMessage({ code: "42501" })).toContain("permessi");
  });
});
