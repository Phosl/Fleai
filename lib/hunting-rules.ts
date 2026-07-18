import type { ComparableDTO, HuntingReportDTO } from "@/lib/contracts";

export type ReliabilityInput = {
  photoCoverage: number;
  identificationSpecificity: number;
  comparableQuality: number;
  marketConsistency: number;
  validComparableCount: number;
  conditionAssessable: boolean;
  highRiskIdentityUnverified: boolean;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export function calculateReliability(input: ReliabilityInput) {
  const weighted =
    clamp(input.photoCoverage) * 0.25 +
    clamp(input.identificationSpecificity) * 0.2 +
    clamp(input.comparableQuality) * 0.35 +
    clamp(input.marketConsistency) * 0.2;

  let score = Math.round(weighted);
  const reasons: string[] = [];

  if (input.validComparableCount < 2) {
    score = Math.min(score, 49);
    reasons.push("Servono almeno due comparabili attendibili.");
  }
  if (!input.conditionAssessable) {
    score = Math.min(score, 59);
    reasons.push("Le condizioni non sono visibili in modo completo.");
  }
  if (input.highRiskIdentityUnverified) {
    score = Math.min(score, 59);
    reasons.push("Identità o autenticità richiedono una verifica esperta.");
  }

  return {
    score,
    label: score >= 75 ? ("high" as const) : score >= 50 ? ("medium" as const) : ("low" as const),
    reasons,
  };
}

export function calculateSuggestedMaxBuy(resaleLow: number, extraCosts: number) {
  const available = Math.max(0, resaleLow - extraCosts);
  const maxForMargin = available - 15;
  const maxForRoi = available / 1.3;
  return Math.max(0, Math.floor(Math.min(maxForMargin, maxForRoi)));
}

export function calculateHuntingDecision(input: {
  askingPrice: number;
  extraCosts: number;
  resaleLow: number;
  confidenceScore: number;
  hasBlockingRisk?: boolean;
}) {
  const suggestedMaxBuy = calculateSuggestedMaxBuy(input.resaleLow, input.extraCosts);
  const estimatedMargin = input.resaleLow - input.askingPrice - input.extraCosts;
  const estimatedRoi = input.askingPrice > 0 ? (estimatedMargin / input.askingPrice) * 100 : 0;

  if (input.confidenceScore < 50) {
    return { suggestedMaxBuy, estimatedMargin, estimatedRoi, recommendation: "needs_more_info" as const };
  }
  if (input.hasBlockingRisk) {
    return { suggestedMaxBuy, estimatedMargin, estimatedRoi, recommendation: "pass" as const };
  }
  if (input.askingPrice <= suggestedMaxBuy && estimatedMargin >= 15 && estimatedRoi >= 30) {
    return { suggestedMaxBuy, estimatedMargin, estimatedRoi, recommendation: "buy_to_resell" as const };
  }
  if (input.resaleLow > input.askingPrice) {
    return { suggestedMaxBuy, estimatedMargin, estimatedRoi, recommendation: "good_potential" as const };
  }
  return { suggestedMaxBuy, estimatedMargin, estimatedRoi, recommendation: "pass" as const };
}

export function validEuroComparables(comparables: ComparableDTO[]) {
  return comparables.filter(
    (item) => item.currency === "EUR" && item.price !== null && item.similarity >= 55,
  );
}

export function buildReport(input: {
  base: Omit<
    HuntingReportDTO,
    "suggestedMaxBuy" | "estimatedMargin" | "estimatedRoi" | "recommendation" | "confidence"
  >;
  reliability: ReliabilityInput;
  hasBlockingRisk?: boolean;
}): HuntingReportDTO {
  const confidence = calculateReliability(input.reliability);
  const decision = calculateHuntingDecision({
    askingPrice: input.base.askingPrice,
    extraCosts: input.base.extraCosts,
    resaleLow: input.base.resaleLow,
    confidenceScore: confidence.score,
    hasBlockingRisk: input.hasBlockingRisk,
  });
  return { ...input.base, ...decision, confidence };
}
