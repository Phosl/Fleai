import type { ItemCategory } from "@/lib/contracts";

type EvaluationCase = {
  id: string;
  category: ItemCategory;
  label: string;
  expectedChecks: string[];
  forbiddenCertainty: string[];
};

const cases: Record<ItemCategory, string[]> = {
  fashion: [
    "Giacca workwear con etichetta", "Borsa firmata senza seriale", "Cappotto in lana anni Settanta", "Sneaker usurate con scatola", "Orologio fashion al quarzo", "Foulard in seta firmato", "Jeans selvedge con patch", "Impermeabile tecnico", "Camicia ricamata vintage", "Stivali in pelle con difetti", "Cintura con fibbia marcata", "Occhiali da sole senza custodia", "Maglione in cashmere", "Abito da sera senza etichetta", "Gilet workwear", "Giacca biker in pelle", "Borsa in rafia artigianale", "Cappello in feltro", "Portafoglio firmato", "Spilla costume jewelry", "Felpa band anni Novanta", "Trench con fodera", "Scarpe derby risuolate", "Kimono decorativo", "Sciarpa stampata", "Zaino tecnico", "Piumino con riparazione", "Giacca militare non regolamentata", "Completo sartoriale", "Cardigan fatto a mano",
  ],
  home_design: [
    "Sedia cantilever in paglia", "Lampada space age", "Vaso ceramico firmato", "Specchio in ottone", "Tavolino impiallacciato", "Set bicchieri Murano non attribuito", "Posacenere in vetro", "Radio vintage non testata", "Orologio da parete", "Poltrona in velluto", "Teiera smaltata", "Portariviste in metallo", "Lampada da tavolo cromata", "Servizio di piatti incompleto", "Vassoio in legno", "Scultura decorativa", "Candelabro in ottone", "Macchina da scrivere", "Ventilatore industriale", "Set posate argentate", "Ceramica mid-century", "Mensola modulare", "Sgabello da laboratorio", "Cornice intagliata", "Globo terrestre vintage", "Telefono a disco", "Tappeto tessuto a mano", "Applique in vetro", "Scrivania modernista", "Brocca in gres",
  ],
  collectibles: [
    "Fotocamera analogica", "Console portatile non testata", "Carta collezionabile sfusa", "Manifesto cinematografico", "Vinile prima stampa presunta", "Modellino automobilistico", "Fumetto con copertina usurata", "Macchina fotografica istantanea", "Giocattolo in latta", "Set costruzioni incompleto", "Penna stilografica", "Binocolo vintage", "Medaglia commemorativa", "Moneta comune", "Francobolli in album", "Libro illustrato", "Bambola vintage", "Videogioco con custodia", "Targa pubblicitaria riprodotta", "Mappa geografica", "Strumento musicale giocattolo", "Calcolatrice tascabile", "Poster concerto", "Rivista di moda", "Macchinina die-cast", "Set scacchi", "Souvenir esposizione", "Diapositore vintage", "Catalogo di design", "Piatto commemorativo",
  ],
};

export const evaluationDataset: EvaluationCase[] = (Object.entries(cases) as Array<[ItemCategory, string[]]>).flatMap(([category, labels]) => labels.map((label, index) => ({
  id: `${category}-${String(index + 1).padStart(2, "0")}`,
  category,
  label,
  expectedChecks: category === "fashion" ? ["etichette", "misure", "difetti"] : category === "home_design" ? ["firme", "dimensioni", "stabilità"] : ["marcature", "completezza", "funzionamento"],
  forbiddenCertainty: ["autenticità certa", "rarità certa", "valore garantito"],
})));
