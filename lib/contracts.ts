import { z } from "zod";

export const itemCategorySchema = z.enum([
  "fashion",
  "home_design",
  "collectibles",
]);

export const itemStatusSchema = z.enum([
  "draft",
  "published",
  "reserved",
  "sold",
  "archived",
]);

export const aiRunKindSchema = z.enum([
  "hunting_report",
  "listing_draft",
  "marketing_images",
  "social_pack",
]);

export const aiRunStatusSchema = z.enum([
  "queued",
  "moderating",
  "inspecting",
  "researching",
  "synthesizing",
  "generating",
  "rendering",
  "needs_input",
  "completed",
  "failed",
]);

export const mediaAssetKindSchema = z.enum([
  "real",
  "clean_ai",
  "context_ai",
  "try_on_ai",
  "social_still",
  "social_video",
]);

export const comparableSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(180),
  url: z.string().url(),
  sourceName: z.string().min(1).max(120),
  price: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
  priceType: z.enum(["asking", "sold", "unknown"]),
  condition: z.string().max(120).nullable(),
  observedAt: z.string(),
  similarity: z.number().min(0).max(100),
});

export const identificationSchema = z.object({
  label: z.string().min(1).max(180),
  category: itemCategorySchema,
  brand: z.string().max(120).nullable(),
  model: z.string().max(120).nullable(),
  era: z.string().max(80).nullable(),
  materials: z.array(z.string().max(80)).max(8),
  observedCondition: z.array(z.string().max(240)).max(12),
  unknowns: z.array(z.string().max(240)).max(12),
});

export const huntingReportSchema = z.object({
  identification: identificationSchema,
  askingPrice: z.number().nonnegative(),
  extraCosts: z.number().nonnegative(),
  resaleLow: z.number().nonnegative(),
  resaleLikely: z.number().nonnegative(),
  resaleHigh: z.number().nonnegative(),
  suggestedMaxBuy: z.number().nonnegative(),
  estimatedMargin: z.number(),
  estimatedRoi: z.number(),
  currency: z.literal("EUR"),
  recommendation: z.enum([
    "buy_to_resell",
    "good_potential",
    "pass",
    "needs_more_info",
  ]),
  confidence: z.object({
    score: z.number().min(0).max(100),
    label: z.enum(["low", "medium", "high"]),
    reasons: z.array(z.string().max(240)).max(8),
  }),
  risks: z.array(z.string().max(240)).max(12),
  nextChecks: z.array(z.string().max(240)).max(12),
  comparables: z.array(comparableSchema).max(12),
  disclaimer: z.string().max(500),
});

export const listingDraftSchema = z.object({
  title: z.string().min(4).max(100),
  description: z.string().min(20).max(3000),
  category: itemCategorySchema,
  brand: z.string().max(120).nullable(),
  condition: z.string().min(2).max(240),
  defects: z.array(z.string().max(240)).max(12),
  price: z.number().nonnegative(),
  currency: z.literal("EUR"),
  attributes: z.record(z.string(), z.string()),
  vintedTitle: z.string().min(4).max(100),
  vintedDescription: z.string().min(20).max(3000),
  instagramCaption: z.string().max(2200),
  tiktokCaption: z.string().max(2200),
  hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u)).max(20),
});

export const createAiRunSchema = z.object({
  itemId: z.string().uuid(),
  kind: aiRunKindSchema,
  idempotencyKey: z.string().uuid(),
  input: z
    .object({
      askingPrice: z.number().nonnegative().optional(),
      extraCosts: z.number().nonnegative().optional(),
      notes: z.string().max(1000).optional(),
      tryOn: z
        .object({
          presentation: z.enum(["woman", "man", "neutral"]),
          ageRange: z.enum(["18-29", "30-44", "45-60", "60+"]),
          heightCm: z.number().int().min(140).max(210),
          weightKg: z.number().int().min(40).max(180),
        })
        .optional(),
    })
    .default({}),
});

export const signedUploadSchema = z.object({
  itemId: z.string().uuid(),
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z.number().int().positive().max(12 * 1024 * 1024),
});

export const createItemSchema = z.object({
  category: itemCategorySchema,
  askingPrice: z.number().nonnegative().max(1_000_000),
  extraCosts: z.number().nonnegative().max(1_000_000).default(0),
  notes: z.string().trim().max(1000).default(""),
});

export const publishItemSchema = z.object({
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(20).max(3000),
  condition: z.string().trim().min(2).max(240),
  defects: z.array(z.string().trim().min(1).max(240)).max(12),
  price: z.number().nonnegative().max(1_000_000),
  approvedMediaIds: z.array(z.string().uuid()).min(1).max(12),
  confirmation: z.literal(true),
});

export const inquirySchema = z.object({
  listingId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(200),
  message: z.string().trim().min(10).max(1200),
  turnstileToken: z.string().min(1),
  consent: z.literal(true),
});

export type ItemCategory = z.infer<typeof itemCategorySchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type AiRunKind = z.infer<typeof aiRunKindSchema>;
export type AiRunStatus = z.infer<typeof aiRunStatusSchema>;
export type MediaAssetKind = z.infer<typeof mediaAssetKindSchema>;
export type ComparableDTO = z.infer<typeof comparableSchema>;
export type HuntingReportDTO = z.infer<typeof huntingReportSchema>;
export type ListingDraftDTO = z.infer<typeof listingDraftSchema>;
export type CreateAiRunInput = z.infer<typeof createAiRunSchema>;

export const AI_GENERATED_LABEL = "Visualizzazione AI";
export const HUNTING_MONTHLY_LIMIT = 5;
export const SHOP_MONTHLY_LIMIT = 3;
