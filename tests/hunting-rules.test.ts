import { describe, expect, it } from "vitest";
import { calculateHuntingDecision, calculateReliability, calculateSuggestedMaxBuy, validEuroComparables } from "@/lib/hunting-rules";

describe("regole Hunting", () => {
  it("applica insieme margine minimo e ROI minimo alla stima bassa", () => {
    expect(calculateSuggestedMaxBuy(100, 10)).toBe(69);
    expect(calculateHuntingDecision({ askingPrice: 69, extraCosts: 10, resaleLow: 100, confidenceScore: 80 })).toMatchObject({ recommendation: "buy_to_resell", estimatedMargin: 21 });
    expect(calculateHuntingDecision({ askingPrice: 70, extraCosts: 10, resaleLow: 100, confidenceScore: 80 }).recommendation).toBe("good_potential");
  });

  it("non dà una decisione sotto affidabilità 50", () => {
    expect(calculateHuntingDecision({ askingPrice: 10, extraCosts: 0, resaleLow: 100, confidenceScore: 49 }).recommendation).toBe("needs_more_info");
  });

  it("limita l'affidabilità a bassa con meno di due comparabili", () => {
    const confidence = calculateReliability({ photoCoverage: 100, identificationSpecificity: 100, comparableQuality: 100, marketConsistency: 100, validComparableCount: 1, conditionAssessable: true, highRiskIdentityUnverified: false });
    expect(confidence).toMatchObject({ score: 49, label: "low" });
  });

  it("esclude valute non EUR, prezzi nulli e somiglianza debole", () => {
    const base = { title: "Test", url: "https://example.com", sourceName: "Fonte", priceType: "asking" as const, condition: null, observedAt: new Date().toISOString() };
    expect(validEuroComparables([
      { ...base, price: 10, currency: "EUR", similarity: 80 },
      { ...base, price: 10, currency: "USD", similarity: 80 },
      { ...base, price: null, currency: "EUR", similarity: 80 },
      { ...base, price: 10, currency: "EUR", similarity: 40 },
    ])).toHaveLength(1);
  });
});
