import { describe, expect, it } from "vitest";
import {
  adminItemModerationSchema,
  adminItemTransitionSchema,
  adminItemUpdateSchema,
  adminUserSuspensionSchema,
  adminUserUpdateSchema,
} from "@/lib/contracts";
import { assertAdminTargetCanBeSuspended, canAdminTransitionItem } from "@/lib/admin/rules";
import { safeAuthNextPath } from "@/lib/auth/redirect";

describe("regole Super Admin", () => {
  it("consente solo transizioni commerciali coerenti", () => {
    expect(canAdminTransitionItem("draft", "published")).toBe(true);
    expect(canAdminTransitionItem("published", "reserved")).toBe(true);
    expect(canAdminTransitionItem("reserved", "published")).toBe(true);
    expect(canAdminTransitionItem("reserved", "sold")).toBe(true);
    expect(canAdminTransitionItem("sold", "published")).toBe(false);
    expect(canAdminTransitionItem("archived", "reserved")).toBe(false);
  });

  it("impedisce autosospensione e sospensione di altri admin", () => {
    expect(assertAdminTargetCanBeSuspended({ actorId: "a", targetId: "a", targetIsAdmin: true })).toContain("tuo account");
    expect(assertAdminTargetCanBeSuspended({ actorId: "a", targetId: "b", targetIsAdmin: true })).toContain("amministratore");
    expect(assertAdminTargetCanBeSuspended({ actorId: "a", targetId: "b", targetIsAdmin: false })).toBeNull();
  });

  it("valida le mutation utente e richiede sempre una motivazione", () => {
    expect(adminUserUpdateSchema.safeParse({ displayName: "Mario", bio: null, huntingLimitOverride: 8, shopLimitOverride: null, reason: "Beta estesa" }).success).toBe(true);
    expect(adminUserUpdateSchema.safeParse({ displayName: "Mario", bio: null, huntingLimitOverride: -1, shopLimitOverride: null, reason: "No" }).success).toBe(false);
    expect(adminUserSuspensionSchema.safeParse({ suspended: true, reason: "Violazione policy" }).success).toBe(true);
    expect(adminUserSuspensionSchema.safeParse({ suspended: true, reason: "x" }).success).toBe(false);
  });

  it("valida aggiornamento, moderazione e pubblicazione admin", () => {
    expect(adminItemUpdateSchema.safeParse({ title: "Sedia", description: "", category: "home_design", brand: null, condition: null, defects: [], price: null, askingPrice: 10, extraCosts: 0, reason: "Correzione scheda" }).success).toBe(true);
    expect(adminItemModerationSchema.safeParse({ decision: "blocked", reason: "Oggetto vietato" }).success).toBe(true);
    expect(adminItemTransitionSchema.safeParse({ status: "published", approvedMediaIds: [], reason: "Revisione completata" }).success).toBe(true);
  });

  it("accetta redirect interni app/admin e blocca redirect esterni", () => {
    expect(safeAuthNextPath("/admin/items?page=2")).toBe("/admin/items?page=2");
    expect(safeAuthNextPath("/app/shop")).toBe("/app/shop");
    expect(safeAuthNextPath("//evil.example/admin")).toBe("/app");
    expect(safeAuthNextPath("/\\evil.example/admin")).toBe("/app");
    expect(safeAuthNextPath("/privacy")).toBe("/app");
  });
});
