import { describe, expect, it } from "vitest";
import {
  FALLBACK_INSPECTION_IMAGE_LIMIT,
  FAST_INSPECTION_IMAGE_LIMIT,
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
    expect(shouldEscalateInspection({
      identificationSpecificity: 80,
      photoCoverage: 45,
      conditionAssessable: true,
    }, { hasAdditionalImages: true })).toBe(true);
    expect(shouldEscalateInspection({
      identificationSpecificity: 80,
      photoCoverage: 80,
      conditionAssessable: true,
      highRiskIdentityUnverified: true,
    })).toBe(true);
  });

  it("limita il passaggio veloce a una foto e lascia le altre al fallback capace", () => {
    expect(FAST_INSPECTION_IMAGE_LIMIT).toBe(1);
    expect(FALLBACK_INSPECTION_IMAGE_LIMIT).toBe(3);
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
