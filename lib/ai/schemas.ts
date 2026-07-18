import { z } from "zod";
import { comparableSchema, identificationSchema, listingDraftSchema } from "@/lib/contracts";

const generatedComparableSchema = comparableSchema
  .omit({ id: true, url: true })
  .extend({ url: z.string() });

export const inspectionResultSchema = z.object({
  identification: identificationSchema,
  marketplacePolicy: z.object({
    allowed: z.boolean(),
    reason: z.string().max(300).nullable(),
  }),
  photoCoverage: z.number().int().min(0).max(100),
  identificationSpecificity: z.number().int().min(0).max(100),
  conditionAssessable: z.boolean(),
  highRiskIdentityUnverified: z.boolean(),
  risks: z.array(z.string().max(240)).max(12),
  nextChecks: z.array(z.string().max(240)).max(12),
});

export const marketSynthesisSchema = z.object({
  comparables: z.array(generatedComparableSchema).max(12),
  resaleLow: z.number().nonnegative(),
  resaleLikely: z.number().nonnegative(),
  resaleHigh: z.number().nonnegative(),
  marketConsistency: z.number().min(0).max(100),
  risks: z.array(z.string().max(240)).max(12),
});

export const listingGenerationSchema = listingDraftSchema;

export type InspectionResult = z.infer<typeof inspectionResultSchema>;
export type MarketSynthesis = z.infer<typeof marketSynthesisSchema>;
