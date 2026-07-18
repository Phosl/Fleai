import { describe, expect, it } from "vitest";
import {
  hasDistinctFallbackModel,
  shouldEscalateInspection,
  shouldEscalateResearch,
  shouldRetryResearchAfterSynthesis,
} from "@/lib/ai/model-routing";

describe("routing modelli AI", () => {
  it("passa al modello più capace solo quando il riconoscimento rapido è debole", () => {
    expect(shouldEscalateInspection({ identificationSpecificity: 49 })).toBe(true);
    expect(shouldEscalateInspection({ identificationSpecificity: 50 })).toBe(false);
  });

  it("richiede almeno due fonti web distinte", () => {
    expect(shouldEscalateResearch([
      { url: "https://example.com/a" },
      { url: "https://example.com/a" },
    ])).toBe(true);
    expect(shouldEscalateResearch([
      { url: "https://example.com/a" },
      { url: "https://example.com/b" },
    ])).toBe(false);
  });

  it("riprova la ricerca se la sintesi non conserva due comparabili EUR validi", () => {
    const comparable = {
      title: "Oggetto simile",
      url: "https://example.com/a",
      sourceName: "Esempio",
      price: 42,
      currency: "EUR",
      priceType: "asking" as const,
      condition: "Buone",
      observedAt: "2026-07-18",
      similarity: 70,
    };
    expect(shouldRetryResearchAfterSynthesis([comparable])).toBe(true);
    expect(shouldRetryResearchAfterSynthesis([
      comparable,
      { ...comparable, url: "https://example.com/b" },
    ])).toBe(false);
  });

  it("non duplica chiamate quando modello rapido e fallback coincidono", () => {
    expect(hasDistinctFallbackModel("gpt-5.6-luna", "gpt-5.6-terra")).toBe(true);
    expect(hasDistinctFallbackModel("gpt-5.6-terra", "gpt-5.6-terra")).toBe(false);
  });
});
