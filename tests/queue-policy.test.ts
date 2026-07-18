import { describe, expect, it } from "vitest";
import { isTerminalAttempt, shouldDeleteQueueMessage } from "@/supabase/functions/_shared/retry-policy";

describe("retry della queue", () => {
  it("rimuove soltanto successi e fallimenti terminali persistiti", () => {
    expect(shouldDeleteQueueMessage(200)).toBe(true);
    expect(shouldDeleteQueueMessage(422)).toBe(true);
    expect(shouldDeleteQueueMessage(429)).toBe(false);
    expect(shouldDeleteQueueMessage(503)).toBe(false);
  });

  it("termina al terzo tentativo", () => {
    expect(isTerminalAttempt(1)).toBe(false);
    expect(isTerminalAttempt(2)).toBe(false);
    expect(isTerminalAttempt(3)).toBe(true);
  });
});
