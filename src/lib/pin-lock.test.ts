import { describe, expect, it } from "vitest";
import { pinLockMinutesLeft } from "./otp.functions";

describe("PIN lock: 5 wrong PINs lock PIN login for 15 minutes", () => {
  const t0 = Date.parse("2026-11-15T10:00:00Z");
  it("4 wrong PINs do not lock", () => expect(pinLockMinutesLeft(4, "2026-11-15T10:00:00Z", t0)).toBe(0));
  it("5 wrong PINs lock for 15 minutes", () => expect(pinLockMinutesLeft(5, "2026-11-15T10:00:00Z", t0)).toBe(15));
  it("lock ends after 15 minutes", () => expect(pinLockMinutesLeft(5, "2026-11-15T10:00:00Z", t0 + 15 * 60_000)).toBe(0));
});
