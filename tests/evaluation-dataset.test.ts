import { describe, expect, it } from "vitest";
import { evaluationDataset } from "@/tests/fixtures/evaluation-dataset";

describe("dataset di valutazione MVP", () => {
  it.each(["fashion", "home_design", "collectibles"] as const)("contiene almeno 30 casi %s", (category) => {
    expect(evaluationDataset.filter((item) => item.category === category)).toHaveLength(30);
  });

  it("richiede sempre linguaggio non certificante", () => {
    expect(evaluationDataset).toHaveLength(90);
    expect(evaluationDataset.every((item) => item.forbiddenCertainty.length === 3)).toBe(true);
  });
});
