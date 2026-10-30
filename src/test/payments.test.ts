import { describe, expect, it } from "vitest";
import { defaultPayMethod, releaseLine, validUtr } from "@/lib/payments";

describe("defaultPayMethod", () => {
  it("pre-selects credit when the customer has a limit and is not blocked", () => {
    expect(defaultPayMethod({ credit_limit: 10000, credit_blocked: false })).toBe("credit");
  });

  it("falls back to cash with no limit, a blocked account or no quote", () => {
    expect(defaultPayMethod({ credit_limit: 0, credit_blocked: false })).toBe("cash");
    expect(defaultPayMethod({ credit_limit: 5000, credit_blocked: true })).toBe("cash");
    expect(defaultPayMethod(null)).toBe("cash");
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
