import { describe, it, expect, beforeEach } from "vitest";
import { readGate, writeGate, clearGate, GATE_COLD_MAX_MS } from "@/lib/gate-cache";
import type { RegistrationDto } from "@/lib/registration.functions";

const reg = { status: "active", customerId: "c1" } as unknown as RegistrationDto;

describe("gate cache", () => {
  beforeEach(() => clearGate());

  it("a fresh check is reused without a re-check", () => {
    writeGate("u1", reg, 1000);
    expect(readGate("u1", 2000)).toEqual({ reg, stale: false });
  });

  it("is never shared with another user", () => {
    writeGate("u1", reg, 1000);
    expect(readGate("u2", 2000)).toBeNull();
  });

  it("is cleared on sign-out", () => {
    writeGate("u1", reg, 1000);
    clearGate();
    expect(readGate("u1", 2000)).toBeNull();
  });

  it("past a day old, the saved check is not used", () => {
    const now = Date.now();
    writeGate("u1", reg, now - GATE_COLD_MAX_MS - 1000);
    expect(readGate("u1", now)).toBeNull();
  });
});
