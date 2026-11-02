import { describe, it, expect, beforeEach } from "vitest";
import { readGate, writeGate, clearGate, GATE_COLD_MAX_MS } from "@/lib/gate-cache";
import type { RegistrationDto } from "@/lib/registration.functions";

const reg = { status: "active", customerId: "c1" } as unknown as RegistrationDto;
const store: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => (store[k] = v),
  removeItem: (k: string) => delete store[k],
};

describe("gate cache 2nd open", () => {
  beforeEach(() => clearGate());
  it("a saved check up to 24 h old is reused on a cold open and marked for re-check", async () => {
    writeGate("u1", reg, 0);
    const mod = await import("@/lib/gate-cache?cold");
    const r = mod.readGate("u1", GATE_COLD_MAX_MS);
    expect(r?.reg.status).toBe("active");
    expect(r?.stale).toBe(true);
  });
  it("a saved check older than 24 h is not used", () => {
    writeGate("u1", reg, 0);
    expect(readGate("u1", GATE_COLD_MAX_MS + 1)).toBeNull();
  });
  it("another user's saved check is never used", () => {
    writeGate("u1", reg, 0);
    expect(readGate("u2", 1000)).toBeNull();
  });
});
