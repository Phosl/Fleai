import { ITEM_CATEGORIES } from "@/lib/contracts";
import type { AiRunKind, AiRunStatus, ItemCategory, ItemStatus, MediaAssetKind, ModerationStatus } from "@/lib/contracts";

export const itemStatusLabel: Record<ItemStatus, string> = {
  draft: "Bozza",
  published: "Pubblicato",
  reserved: "Riservato",
  sold: "Venduto",
  archived: "Archiviato",
};

export const moderationLabel: Record<ModerationStatus, string> = {
  pending: "In revisione",
  approved: "Approvato",
  blocked: "Bloccato",
};

export const categoryLabel: Record<ItemCategory, string> = {
  fashion: "Moda e accessori",
  home_design: "Casa e design",
  electronics: "Elettronica",
  collectibles: "Collezionabili",
  art_antiques: "Arte e antiquariato",
  books_comics: "Libri e fumetti",
  music_instruments: "Musica e strumenti",
  toys_games: "Giochi e giocattoli",
  sports_outdoor: "Sport e tempo libero",
  tools_diy: "Utensili e fai da te",
  other: "Altro",
};

export const itemCategoryOptions = ITEM_CATEGORIES.map((value) => ({
  value,
  label: categoryLabel[value],
}));

export function categoryDisplayLabel(category: string) {
  return categoryLabel[category as ItemCategory] ?? category;
}

export const aiRunKindLabel: Record<AiRunKind, string> = {
  hunting_report: "Ricerca Hunting",
  listing_draft: "Scheda annuncio",
  marketing_images: "Visual AI",
  social_pack: "Contenuti social",
};

export const aiRunStatusLabel: Record<AiRunStatus, string> = {
  queued: "In coda",
  moderating: "Controllo immagini",
  inspecting: "Analisi oggetto",
  researching: "Ricerca comparabili",
  synthesizing: "Preparazione report",
  generating: "Generazione",
  rendering: "Finalizzazione",
  needs_input: "Servono informazioni",
  completed: "Completata",
  failed: "Non completata",
};

export const mediaAssetKindLabel: Record<MediaAssetKind, string> = {
  real: "Foto reale",
  clean_ai: "Hero ripulita",
  context_ai: "Scena contestualizzata",
  try_on_ai: "Virtual try-on",
  social_still: "Formato social",
  social_video: "Video social",
};
