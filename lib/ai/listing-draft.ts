import type { HuntingReportDTO, ListingDraftDTO } from "@/lib/contracts";
import { listingDraftSchema } from "@/lib/contracts";
import type { ListingGeneration } from "@/lib/ai/schemas";

const defectPattern = /\b(?:difett|graff|usur|macchi|ossid|rott|strapp|sbecc|crep|ammacc|segni?)\w*/i;

const categoryHashtags: Record<HuntingReportDTO["identification"]["category"], string[]> = {
  fashion: ["#fleai", "#secondhand", "#vintageitalia", "#modacircolare"],
  home_design: ["#fleai", "#secondhand", "#arredovintage", "#homedesign"],
  electronics: ["#fleai", "#secondhand", "#elettronicavintage", "#techusato"],
  collectibles: ["#fleai", "#secondhand", "#collezionismo", "#vintageitalia"],
  art_antiques: ["#fleai", "#secondhand", "#arte", "#antiquariato"],
  books_comics: ["#fleai", "#secondhand", "#librivintage", "#fumetti"],
  music_instruments: ["#fleai", "#secondhand", "#musicavintage", "#strumentimusicali"],
  toys_games: ["#fleai", "#secondhand", "#giochivintage", "#giocattoli"],
  sports_outdoor: ["#fleai", "#secondhand", "#sportusato", "#outdoor"],
  tools_diy: ["#fleai", "#secondhand", "#faidate", "#utensilivintage"],
  other: ["#fleai", "#secondhand", "#mercatino", "#vintageitalia"],
};

function truncate(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
}

function listingTitle(report: HuntingReportDTO) {
  const label = truncate(report.identification.label, 100);
  return label.length >= 4 ? label : truncate(`Oggetto ${label}`, 100);
}

function listingPrice(report: HuntingReportDTO, preferredPrice?: number) {
  return typeof preferredPrice === "number" && Number.isFinite(preferredPrice) && preferredPrice >= 0
    ? preferredPrice
    : report.resaleLikely;
}

function listingAttributes(report: HuntingReportDTO) {
  const identification = report.identification;
  return Object.fromEntries([
    ["marca", identification.brand],
    ["modello", identification.model],
    ["epoca", identification.era],
    ["materiali", identification.materials.join(", ") || null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1])));
}

export function listingPromptSource(report: HuntingReportDTO, preferredPrice?: number) {
  return {
    identification: report.identification,
    risks: report.risks,
    nextChecks: report.nextChecks,
    suggestedPrice: listingPrice(report, preferredPrice),
    currency: report.currency,
  };
}

export function completeListingDraft(
  report: HuntingReportDTO,
  generated: ListingGeneration,
  preferredPrice?: number,
): ListingDraftDTO {
  return listingDraftSchema.parse({
    ...generated,
    category: report.identification.category,
    brand: report.identification.brand,
    attributes: listingAttributes(report),
    price: listingPrice(report, preferredPrice),
    currency: "EUR",
    vintedTitle: generated.title,
    vintedDescription: generated.description,
  });
}

export function createFallbackListingDraft(
  report: HuntingReportDTO,
  preferredPrice?: number,
): ListingDraftDTO {
  const identification = report.identification;
  const title = listingTitle(report);
  const observedCondition = identification.observedCondition.map((entry) => truncate(entry, 240));
  const condition = truncate(
    observedCondition.join("; ") || "Condizioni da verificare sulle foto reali",
    240,
  );
  const facts = [
    `${title}.`,
    identification.materials.length
      ? `Materiali osservati: ${identification.materials.join(", ")}.`
      : "Materiali da confermare.",
    observedCondition.length
      ? `Condizioni visibili: ${observedCondition.join("; ")}.`
      : "Condizioni da verificare sulle foto reali.",
    identification.unknowns.length
      ? `Da verificare: ${identification.unknowns.join("; ")}.`
      : "Controlla comunque misure, etichette e dettagli prima della vendita.",
  ];
  const description = truncate(facts.join(" "), 3000);
  const price = listingPrice(report, preferredPrice);
  const defects = observedCondition.filter((entry) => defectPattern.test(entry)).slice(0, 12);
  const priceLabel = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);

  return listingDraftSchema.parse({
    title,
    description,
    category: identification.category,
    brand: identification.brand,
    condition,
    defects,
    price,
    currency: "EUR",
    attributes: listingAttributes(report),
    vintedTitle: title,
    vintedDescription: description,
    instagramCaption: truncate(`${title}. Disponibile a ${priceLabel}. Controlla le foto reali per condizioni e dettagli.`, 2200),
    tiktokCaption: truncate(`${title} · ${priceLabel} · condizioni visibili nelle foto reali.`, 2200),
    hashtags: categoryHashtags[identification.category],
  });
}
