import { describe, expect, it } from "vitest";
import {
  hasDistinctFallbackModel,
  shouldEscalateInspection,
  shouldEscalateResearch,
  shouldRetryResearchAfterSynthesis,
} from "@/lib/ai/model-routing";

describe("routing modelli AI", () => {
  it("passa al modello più capace solo quando il riconoscimento rapido non identifica l'oggetto", () => {
    expect(shouldEscalateInspection({ identificationSpecificity: 19 })).toBe(true);
    expect(shouldEscalateInspection({ identificationSpecificity: 35 })).toBe(false);
    expect(shouldEscalateInspection({
      identificationSpecificity: 80,
      identification: { label: "Oggetto non identificato" },
    })).toBe(true);
  });

  it("usa il fallback di ricerca soltanto quando Luna non trova fonti", () => {
    expect(shouldEscalateResearch([])).toBe(true);
    expect(shouldEscalateResearch([{ url: "https://example.com/a" }])).toBe(false);
  });

  it("riprova la ricerca se la sintesi non conserva alcun comparabile EUR valido", () => {
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
    expect(shouldRetryResearchAfterSynthesis([])).toBe(true);
    expect(shouldRetryResearchAfterSynthesis([comparable])).toBe(false);
  });

  it("non duplica chiamate quando modello rapido e fallback coincidono", () => {
    expect(hasDistinctFallbackModel("gpt-5.6-luna", "gpt-5.6-terra")).toBe(true);
    expect(hasDistinctFallbackModel("gpt-5.6-terra", "gpt-5.6-terra")).toBe(false);
  });
});
