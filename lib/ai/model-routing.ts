import type { ComparableDTO } from "@/lib/contracts";
import { validEuroComparables } from "@/lib/hunting-rules";

export const MIN_FAST_IDENTIFICATION_SPECIFICITY = 50;
export const MIN_RESEARCH_SOURCES = 2;
export const MIN_VALID_COMPARABLES = 2;

export function hasDistinctFallbackModel(fastModel: string, fallbackModel: string) {
  return fastModel.trim() !== fallbackModel.trim();
}

export function shouldEscalateInspection(result: { identificationSpecificity: number }) {
  return result.identificationSpecificity < MIN_FAST_IDENTIFICATION_SPECIFICITY;
}

export function shouldEscalateResearch(sources: ReadonlyArray<{ url: string }>) {
  const uniqueUrls = new Set(sources.map((source) => source.url.trim()).filter(Boolean));
  return uniqueUrls.size < MIN_RESEARCH_SOURCES;
}

export function shouldRetryResearchAfterSynthesis(comparables: ComparableDTO[]) {
  return validEuroComparables(comparables).length < MIN_VALID_COMPARABLES;
}
