import type { ItemStatus, ModerationStatus } from "@/lib/contracts";

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

export const categoryLabel = {
  fashion: "Moda",
  home_design: "Casa e design",
  collectibles: "Collezionabili",
} as const;
