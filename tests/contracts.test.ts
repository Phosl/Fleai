import { describe, expect, it } from "vitest";
import { createAiRunSchema, huntingReportSchema, inquirySchema, listingDraftSchema } from "@/lib/contracts";
import { demoListing, demoReport } from "@/lib/demo-data";

describe("contratti strutturati", () => {
  it("valida report e bozza completi", () => {
    expect(huntingReportSchema.parse(demoReport)).toEqual(demoReport);
    expect(listingDraftSchema.parse(demoListing)).toEqual(demoListing);
  });

  it("rifiuta try-on di minori o misure fuori range", () => {
    expect(() => createAiRunSchema.parse({ itemId: crypto.randomUUID(), kind: "marketing_images", idempotencyKey: crypto.randomUUID(), input: { tryOn: { presentation: "woman", ageRange: "12-17", heightCm: 130, weightKg: 30 } } })).toThrow();
  });

  it("richiede consenso e token nel modulo pubblico", () => {
    expect(inquirySchema.safeParse({ listingId: crypto.randomUUID(), name: "Ada", email: "ada@example.com", message: "È disponibile?", consent: false, turnstileToken: "" }).success).toBe(false);
  });
});
