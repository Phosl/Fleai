import { describe, expect, it } from "vitest";
import {
  advanceAiRunProgress,
  aiRunFailureMessage,
  isAiRunActive,
  isAiRunStalled,
  mergeAiRunProgress,
} from "@/lib/ai/run-state";

const now = Date.parse("2026-07-21T12:00:00.000Z");

describe("stato lavorazioni AI", () => {
  it("considera attivo un run recente", () => {
    const run = { status: "queued" as const, updated_at: "2026-07-21T11:59:30.000Z", attempt_count: 1, error_code: "PROVIDER_INVALID_OUTPUT" };
    expect(isAiRunStalled(run, now)).toBe(false);
    expect(isAiRunActive(run, now)).toBe(true);
  });

  it("sblocca la rigenerazione quando un retry resta fermo in coda", () => {
    const run = { status: "queued" as const, updated_at: "2026-07-21T11:57:00.000Z", attempt_count: 1, error_code: "PROVIDER_INVALID_OUTPUT" };
    expect(isAiRunStalled(run, now)).toBe(true);
    expect(isAiRunActive(run, now)).toBe(false);
  });

  it("presenta un errore specifico per la scheda senza dettagli tecnici", () => {
    expect(aiRunFailureMessage("listing_draft", "PROVIDER_INVALID_OUTPUT")).toMatch(/bozza dell’annuncio/i);
    expect(aiRunFailureMessage("hunting_report", "PROVIDER_INVALID_INPUT")).toMatch(/foto restano salvate/i);
  });

  it("non fa mai arretrare la barra quando il database riporta zero", () => {
    expect(mergeAiRunProgress(5, "queued", 0)).toBe(5);
    expect(mergeAiRunProgress(55, "researching", 0)).toBe(55);
    expect(mergeAiRunProgress(55, "queued", 0)).toBe(55);
  });

  it("mostra attività tra due aggiornamenti senza simulare il completamento", () => {
    let displayed = mergeAiRunProgress(5, "researching", 55);
    for (let index = 0; index < 200; index += 1) {
      displayed = advanceAiRunProgress(displayed, "researching");
    }
    expect(displayed).toBe(72);
    expect(displayed).toBeLessThan(100);
  });
});
