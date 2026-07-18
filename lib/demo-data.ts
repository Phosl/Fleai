import type { HuntingReportDTO, ListingDraftDTO } from "@/lib/contracts";

export const DEMO_IDS = {
  chair: "11111111-1111-4111-8111-111111111111",
  jacket: "22222222-2222-4222-8222-222222222222",
  lamp: "33333333-3333-4333-8333-333333333333",
  listing: "44444444-4444-4444-8444-444444444444",
};

export const demoReport: HuntingReportDTO = {
  identification: {
    label: "Sedia Cesca in tubolare e paglia di Vienna",
    category: "home_design",
    brand: null,
    model: "Stile B32 / Cesca",
    era: "Probabile produzione anni 1970–1990",
    materials: ["Acciaio cromato", "Legno", "Paglia di Vienna"],
    observedCondition: [
      "Struttura cromata integra con ossidazione leggera",
      "Seduta senza rotture visibili",
      "Finitura del legno vissuta sul bordo anteriore",
    ],
    unknowns: [
      "Produttore non identificato",
      "Etichetta o marchio sotto la seduta non fotografati",
    ],
  },
  askingPrice: 35,
  extraCosts: 10,
  resaleLow: 95,
  resaleLikely: 145,
  resaleHigh: 210,
  suggestedMaxBuy: 65,
  estimatedMargin: 50,
  estimatedRoi: 142.8,
  currency: "EUR",
  recommendation: "buy_to_resell",
  confidence: {
    score: 78,
    label: "high",
    reasons: [
      "Tre angolazioni leggibili",
      "Quattro comparabili recenti in EUR",
      "Condizioni osservabili ma produttore non verificato",
    ],
  },
  risks: [
    "Le repliche non firmate valgono meno degli esemplari attribuiti.",
    "Verificare elasticità e rumori del telaio prima dell’acquisto.",
  ],
  nextChecks: [
    "Fotografa il lato inferiore della seduta.",
    "Cerca etichette, timbri o incisioni sul telaio.",
    "Controlla che la paglia non ceda sotto una pressione leggera.",
  ],
  comparables: [
    {
      title: "Sedia cantilever vintage in paglia di Vienna",
      url: "https://www.ebay.it/",
      sourceName: "eBay Italia",
      price: 119,
      currency: "EUR",
      priceType: "asking",
      condition: "Buone condizioni",
      observedAt: "2026-07-17T10:00:00.000Z",
      similarity: 86,
    },
    {
      title: "Coppia sedie stile Cesca anni Settanta",
      url: "https://www.subito.it/",
      sourceName: "Subito",
      price: 220,
      currency: "EUR",
      priceType: "asking",
      condition: "Usato",
      observedAt: "2026-07-16T10:00:00.000Z",
      similarity: 78,
    },
    {
      title: "Vintage tubular chair with cane seat",
      url: "https://www.etsy.com/it/",
      sourceName: "Etsy",
      price: 168,
      currency: "EUR",
      priceType: "asking",
      condition: "Vintage",
      observedAt: "2026-07-14T10:00:00.000Z",
      similarity: 72,
    },
  ],
  disclaimer:
    "Stima orientativa basata sulle foto e su annunci pubblici, non è una perizia né una verifica di autenticità.",
};

export const demoListing: ListingDraftDTO = {
  title: "Sedia cantilever vintage in paglia di Vienna",
  description:
    "Sedia cantilever vintage con struttura in tubolare cromato, schienale e seduta in paglia di Vienna. Il legno presenta una bella patina del tempo e piccoli segni coerenti con l’età. Struttura stabile, paglia integra. Ideale come sedia da scrivania, elemento d’accento o per un interno modernista.",
  category: "home_design",
  brand: null,
  condition: "Buone condizioni vintage",
  defects: ["Lieve ossidazione", "Segni sul bordo anteriore"],
  price: 145,
  currency: "EUR",
  attributes: {
    materiale: "Acciaio, legno e paglia di Vienna",
    stile: "Modernista / Bauhaus",
    epoca: "1970–1990",
    dimensioni: "Da confermare",
  },
  vintedTitle: "Sedia cantilever vintage paglia di Vienna",
  vintedDescription:
    "Sedia vintage in tubolare cromato e paglia di Vienna. Condizioni buone, struttura stabile. Presenta lievi segni del tempo e piccola ossidazione visibile nelle foto reali. Misure disponibili su richiesta.",
  instagramCaption:
    "Linee leggere, paglia di Vienna e quella patina che racconta il tempo. Una cantilever pronta per una nuova casa. Disponibile da Officina Ritrovata — €145.",
  tiktokCaption:
    "L’abbiamo trovata al mercatino e riportata alla luce. Cantilever vintage, paglia integra, €145 ✨",
  hashtags: ["#fleai", "#vintageitalia", "#interiordesign", "#secondhand", "#modernariato"],
};

export const demoItems = [
  {
    id: DEMO_IDS.chair,
    slug: "sedia-cesca-vintage",
    title: "Sedia cantilever vintage",
    price: 145,
    image: "/demo-chair.svg",
    category: "Home design",
    status: "Pubblicato",
    ai: false,
  },
  {
    id: DEMO_IDS.jacket,
    slug: "giacca-workwear-ocra",
    title: "Giacca workwear ocra",
    price: 68,
    image: "/demo-jacket.svg",
    category: "Moda",
    status: "Bozza",
    ai: true,
  },
  {
    id: DEMO_IDS.lamp,
    slug: "lampada-space-age",
    title: "Lampada space age",
    price: 89,
    image: "/demo-lamp.svg",
    category: "Collezionabili",
    status: "Riservato",
    ai: false,
  },
] as const;

export const demoInquiries = [
  {
    id: "1",
    item: "Sedia cantilever vintage",
    name: "Giulia R.",
    message: "Ciao! È ancora disponibile? Potrei passare sabato mattina.",
    time: "12 min fa",
    status: "Nuova",
  },
  {
    id: "2",
    item: "Lampada space age",
    name: "Luca B.",
    message: "Confermo la prenotazione, grazie!",
    time: "Ieri",
    status: "Accettata",
  },
] as const;
