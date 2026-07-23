import { describe, expect, it } from "vitest";
import { workspaceItemHref } from "@/lib/items/routes";

describe("rotte oggetto workspace", () => {
  it("apre sempre il dettaglio privato senza avviare editor o ricerca", () => {
    const href = workspaceItemHref("6697be32-6975-42b7-a9b9-84cc7f696389");
    expect(href).toBe("/app/items/6697be32-6975-42b7-a9b9-84cc7f696389");
    expect(href).not.toContain("/new");
    expect(href).not.toContain("/runs/");
  });
});
