import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ComparableDTO, HuntingReportDTO, ListingDraftDTO } from "@/lib/contracts";
import { huntingReportSchema } from "@/lib/contracts";
import { buildReport } from "@/lib/hunting-rules";
import { inspectionResultSchema, listingGenerationSchema, marketSynthesisSchema } from "@/lib/ai/schemas";
import type { InspectionResult } from "@/lib/ai/schemas";
import { serverEnv } from "@/lib/env/server";

const DISCLAIMER =
  "Stima indicativa basata sulle foto e su annunci web: non certifica autenticità, rarità, condizioni o prezzo di vendita. Verifica l’oggetto dal vivo e, per pezzi importanti, consulta un professionista.";

function client() {
  if (!serverEnv.openAiApiKey) throw new Error("OPENAI_API_KEY_MISSING");
  return new OpenAI({ apiKey: serverEnv.openAiApiKey });
}

function safetyIdentifier(userId: string) {
  return createHash("sha256").update(`fleai:${userId}`).digest("hex");
}

function imageContent(imageUrls: string[]) {
  return imageUrls.slice(0, 3).map((image_url) => ({
    type: "input_image" as const,
    image_url,
    detail: "high" as const,
  }));
}

export async function moderateSubmission(imageUrls: string[], notes: string) {
  const response = await client().moderations.create({
    model: "omni-moderation-latest",
    input: [
      { type: "text", text: notes || "Oggetto proposto per la rivendita" },
      ...imageUrls.slice(0, 3).map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ],
  });
  return {
    allowed: response.results.every((result) => !result.flagged),
    requestId: response.id,
  };
}

export async function inspectItem(input: {
  userId: string;
  imageUrls: string[];
  notes: string;
  categoryHint: string;
}) {
  const response = await client().responses.parse({
    model: serverEnv.openAiAnalysisModel,
    store: false,
    reasoning: { effort: "low" },
    safety_identifier: safetyIdentifier(input.userId),
    instructions: [
      "Sei l'ispettore prudente di Fleai, un assistente italiano per oggetti da mercatino.",
      "Descrivi soltanto elementi visibili. Non dichiarare mai autentici, rari o di valore certo oggetti firmati o importanti.",
      "Blocca armi, medicinali, sostanze, materiale illecito e oggetti dichiaratamente contraffatti.",
      "Se servono etichette, firme, seriali, misure o dettagli dei difetti, elencali tra unknowns e nextChecks.",
      "L'output deve essere in italiano.",
    ].join(" "),
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: `Categoria indicata: ${input.categoryHint}. Note utente: ${input.notes || "nessuna"}. Ispeziona le foto senza fare una stima economica.` },
        ...imageContent(input.imageUrls),
      ],
    }],
    text: { format: zodTextFormat(inspectionResultSchema, "fleai_item_inspection") },
  });
  if (!response.output_parsed) throw new Error("OPENAI_INSPECTION_INVALID");
  return { result: response.output_parsed, requestId: response.id };
}

type CitedSource = { title: string; url: string };

function extractCitedSources(response: Awaited<ReturnType<OpenAI["responses"]["create"]>>) {
  const sources = new Map<string, CitedSource>();
  if (!("output" in response)) return [];
  for (const output of response.output) {
    if (output.type !== "message") continue;
    for (const content of output.content) {
      if (content.type !== "output_text") continue;
      for (const annotation of content.annotations) {
        if (annotation.type === "url_citation") {
          sources.set(annotation.url, { title: annotation.title, url: annotation.url });
        }
      }
    }
  }
  return [...sources.values()];
}

export async function researchComparables(input: {
  userId: string;
  inspection: InspectionResult;
}) {
  const response = await client().responses.create({
    model: serverEnv.openAiAnalysisModel,
    store: false,
    reasoning: { effort: "low" },
    safety_identifier: safetyIdentifier(input.userId),
    tools: [{
      type: "web_search",
      search_context_size: "high",
      user_location: { type: "approximate", country: "IT", region: "Italia", timezone: "Europe/Rome" },
    }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    instructions: [
      "Ricerca comparabili reali e recenti per il mercato Italia/UE.",
      "Distingui sempre prezzi richiesti, venduti e non verificabili.",
      "Non usare valute diverse da EUR per calcolare stime, ma puoi segnalarle nel testo.",
      "Cita inline tutte le pagine da cui ricavi un comparabile. Preferisci oggetti molto simili per marca, modello, epoca, materiale e condizione.",
    ].join(" "),
    input: `Identificazione prudente: ${JSON.stringify(input.inspection.identification)}. Trova fino a 8 comparabili e riporta titolo, prezzo, valuta, tipo di prezzo, condizione, data osservazione e somiglianza motivata.`,
  });
  return { narrative: response.output_text, sources: extractCitedSources(response), requestId: response.id };
}

function keepOnlyCitedComparables(comparables: ComparableDTO[], sources: CitedSource[]) {
  const byUrl = new Map(sources.map((source) => [source.url, source]));
  return comparables.flatMap((comparable) => {
    const cited = byUrl.get(comparable.url);
    if (!cited) return [];
    return [{ ...comparable, sourceName: comparable.sourceName || cited.title }];
  });
}

export async function synthesizeHuntingReport(input: {
  userId: string;
  inspection: InspectionResult;
  researchNarrative: string;
  sources: CitedSource[];
  askingPrice: number;
  extraCosts: number;
}) {
  const response = await client().responses.parse({
    model: serverEnv.openAiAnalysisModel,
    store: false,
    reasoning: { effort: "low" },
    safety_identifier: safetyIdentifier(input.userId),
    instructions: [
      "Sintetizza il mercato in EUR con prudenza.",
      "Ogni comparabile deve usare esattamente uno degli URL citati forniti; non inventare URL.",
      "La fascia bassa deve riflettere il realizzo conservativo nelle condizioni osservate, non il miglior annuncio.",
      "Non calcolare convenienza, ROI o affidabilità: saranno calcolati dall'applicazione.",
    ].join(" "),
    input: `Ispezione: ${JSON.stringify(input.inspection)}\nRicerca: ${input.researchNarrative}\nFonti ammesse: ${JSON.stringify(input.sources)}`,
    text: { format: zodTextFormat(marketSynthesisSchema, "fleai_market_synthesis") },
  });
  if (!response.output_parsed) throw new Error("OPENAI_SYNTHESIS_INVALID");

  const market = response.output_parsed;
  const comparables = keepOnlyCitedComparables(market.comparables, input.sources);
  const validComparableCount = comparables.filter(
    (item) => item.currency === "EUR" && item.price !== null && item.similarity >= 55,
  ).length;
  const comparableQuality = validComparableCount
    ? comparables.reduce((sum, item) => sum + item.similarity, 0) / comparables.length
    : 0;

  const report = buildReport({
    base: {
      identification: input.inspection.identification,
      askingPrice: input.askingPrice,
      extraCosts: input.extraCosts,
      resaleLow: market.resaleLow,
      resaleLikely: market.resaleLikely,
      resaleHigh: market.resaleHigh,
      currency: "EUR",
      risks: [...new Set([...input.inspection.risks, ...market.risks])].slice(0, 12),
      nextChecks: input.inspection.nextChecks,
      comparables,
      disclaimer: DISCLAIMER,
    },
    reliability: {
      photoCoverage: input.inspection.photoCoverage,
      identificationSpecificity: input.inspection.identificationSpecificity,
      comparableQuality,
      marketConsistency: market.marketConsistency,
      validComparableCount,
      conditionAssessable: input.inspection.conditionAssessable,
      highRiskIdentityUnverified: input.inspection.highRiskIdentityUnverified,
    },
    hasBlockingRisk: !input.inspection.marketplacePolicy.allowed,
  });
  return { report: huntingReportSchema.parse(report), requestId: response.id };
}

export async function generateListingDraft(input: {
  userId: string;
  report: HuntingReportDTO;
  preferredPrice?: number;
}) {
  const response = await client().responses.parse({
    model: serverEnv.openAiAnalysisModel,
    store: false,
    reasoning: { effort: "low" },
    safety_identifier: safetyIdentifier(input.userId),
    instructions: [
      "Crea una scheda italiana accurata e copiabile per Vinted e contenuti social.",
      "Non aggiungere dettagli non osservati. Difetti e incertezze devono restare espliciti.",
      "Non affermare autenticità, rarità o valore come certi. Non citare il report privato né costi o margini.",
    ].join(" "),
    input: `Report privato da trasformare in bozza pubblica: ${JSON.stringify(input.report)}. Prezzo preferito: ${input.preferredPrice ?? input.report.resaleLikely} EUR.`,
    text: { format: zodTextFormat(listingGenerationSchema, "fleai_listing_draft") },
  });
  if (!response.output_parsed) throw new Error("OPENAI_LISTING_INVALID");
  return { draft: response.output_parsed as ListingDraftDTO, requestId: response.id };
}
