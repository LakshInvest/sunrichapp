import { describe, expect, it } from "vitest";
import { creditChoice, defaultPayMethod, releaseLine, validUtr } from "@/lib/payments";

describe("defaultPayMethod", () => {
  it("always starts on UPI, never Credit", () => {
    expect(defaultPayMethod({ credit_limit: 10000, credit_blocked: false })).toBe("upi");
    expect(defaultPayMethod(null)).toBe("upi");
  });
});

describe("creditChoice", () => {
  it("blocks Credit when ₹200 is left on a ₹440 bill", () => {
    expect(creditChoice({ credit_limit: 5000, credit_available: 200, credit_blocked: false }, 440)).toEqual({ shown: true, allowed: false, available: 200 });
  });
  it("allows Credit when the bill fits", () => {
    expect(creditChoice({ credit_limit: 5000, credit_available: 440, credit_blocked: false }, 440).allowed).toBe(true);
  });
  it("hides Credit with no limit", () => {
    expect(creditChoice({ credit_limit: 0, credit_available: 0, credit_blocked: false }, 100).shown).toBe(false);
  });
});

describe("validUtr", () => {
  it("accepts exactly 12 digits", () => {
    expect(validUtr("123456789012")).toBe(true);
    expect(validUtr(" 123456789012 ")).toBe(true);
  });

  it("rejects short, long or non-numeric references", () => {
    expect(validUtr("12345678901")).toBe(false);
    expect(validUtr("1234567890123")).toBe(false);
    expect(validUtr("12345678901a")).toBe(false);
    expect(validUtr("")).toBe(false);
  });
});

describe("releaseLine (delivery time from release_batch_at)", () => {
  const now = new Date("2026-10-30T09:00:00");

  it("says dispatching now when released, express or already moving", () => {
    expect(releaseLine({ releasedAt: "2026-10-30T08:00:00", releaseBatchAt: null, isExpress: false, status: "placed" }, now)?.key).toBe("dispatchingNow");
    expect(releaseLine({ releasedAt: null, releaseBatchAt: null, isExpress: true, status: "placed" }, now)?.key).toBe("dispatchingNow");
    expect(releaseLine({ releasedAt: null, releaseBatchAt: null, isExpress: false, status: "dispatched" }, now)?.key).toBe("dispatchingNow");
  });

  it("uses today's dispatch time when release_batch_at is today", () => {
    expect(releaseLine({ releasedAt: null, releaseBatchAt: "2026-10-30T14:00:00", isExpress: false, status: "placed" }, now)).toEqual({
      key: "leavesToday",
      time: "14:00",
    });
  });

  it("uses tomorrow's dispatch time when release_batch_at is tomorrow", () => {
    expect(releaseLine({ releasedAt: null, releaseBatchAt: "2026-10-31T10:00:00", isExpress: false, status: "placed" }, now)).toEqual({
      key: "leavesTomorrow",
      time: "10:00",
    });
  });

  it("falls back to a dated line for later batches and none at all", () => {
    expect(releaseLine({ releasedAt: null, releaseBatchAt: "2026-11-02T14:30:00", isExpress: false, status: "placed" }, now)).toEqual({
      key: "leavesOn",
      time: "14:30",
      date: "2026-11-02",
    });
    expect(releaseLine({ releasedAt: null, releaseBatchAt: null, isExpress: false, status: "placed" }, now)).toBeNull();
  });
});
