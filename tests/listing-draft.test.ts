import { describe, expect, it } from "vitest";
import {
  completeListingDraft,
  createFallbackListingDraft,
  listingPromptSource,
} from "@/lib/ai/listing-draft";
import { listingDraftSchema } from "@/lib/contracts";
import { demoListing, demoReport } from "@/lib/demo-data";

describe("bozza annuncio", () => {
  it("invia al provider soltanto i dati utili e non i comparabili", () => {
    const source = listingPromptSource(demoReport);
    expect(source).not.toHaveProperty("comparables");
    expect(source.suggestedPrice).toBe(demoReport.resaleLikely);
  });

  it("completa l'output AI con i campi affidabili del report", () => {
    const generated = {
      title: demoListing.title,
      description: demoListing.description,
      condition: demoListing.condition,
      defects: demoListing.defects,
      instagramCaption: demoListing.instagramCaption,
      tiktokCaption: demoListing.tiktokCaption,
      hashtags: demoListing.hashtags,
    };
    const draft = completeListingDraft(demoReport, generated, 130);
    expect(draft.category).toBe(demoReport.identification.category);
    expect(draft.brand).toBe(demoReport.identification.brand);
    expect(draft.price).toBe(130);
    expect(draft.vintedTitle).toBe(generated.title);
  });

  it("crea sempre una scheda valida dal report se l'output AI è incompleto", () => {
    const fallback = createFallbackListingDraft(demoReport);
    expect(listingDraftSchema.parse(fallback)).toEqual(fallback);
    expect(fallback.description).toContain("Condizioni visibili");
    expect(fallback.price).toBe(demoReport.resaleLikely);
  });
});
