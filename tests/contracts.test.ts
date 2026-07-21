import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { comparableSchema, createAiRunSchema, createItemSchema, huntingReportSchema, inquirySchema, listingDraftSchema } from "@/lib/contracts";
import { demoListing, demoReport } from "@/lib/demo-data";
import { inspectionResultSchema, listingGenerationSchema, marketSynthesisSchema } from "@/lib/ai/schemas";

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

  it("richiede almeno uno tra nome, marca o descrizione nel creazione oggetto", () => {
    expect(createItemSchema.safeParse({
      category: "fashion",
      askingPrice: 20,
      extraCosts: 5,
      itemName: "Giacca vintage",
      notes: "",
    }).success).toBe(true);
    expect(createItemSchema.safeParse({
      category: "fashion",
      askingPrice: 20,
      extraCosts: 5,
      notes: "",
      itemName: "",
      brand: "",
      searchHint: "",
    }).success).toBe(false);
  });

  it("converte gli schemi generati nel formato Structured Outputs di OpenAI", () => {
    expect(() => zodTextFormat(inspectionResultSchema, "fleai_item_inspection")).not.toThrow();
    const marketFormat = zodTextFormat(marketSynthesisSchema, "fleai_market_synthesis");
    expect(JSON.stringify(marketFormat)).not.toContain('"format":"uri"');
    const listingFormat = zodTextFormat(listingGenerationSchema, "fleai_listing_draft");
    expect(JSON.stringify(listingFormat)).not.toContain("vintedDescription");
  });

  it("richiede percentuali intere per la persistenza dei comparabili", () => {
    expect(comparableSchema.safeParse({
      ...demoReport.comparables[0],
      similarity: 0.8,
    }).success).toBe(false);
  });
});
