import { describe, expect, it } from "vitest";
import { isUnread, kindForStatus } from "@/lib/notifications";
import { lineIssues, showDeliveryOtp } from "@/lib/delivery";

describe("notifications", () => {
  it("maps order statuses to notice kinds", () => {
    expect(kindForStatus("approved")).toBe("approved");
    expect(kindForStatus("credit_hold")).toBe("credit_hold");
    expect(kindForStatus("closed")).toBe("delivered");
    expect(kindForStatus("rejected")).toBe("cancelled");
    expect(kindForStatus("processing")).toBe("status");
  });
  it("is unread only when newer than last seen on this phone", () => {
    expect(isUnread({ at: "2026-01-02" }, "2026-01-01")).toBe(true);
    expect(isUnread({ at: "2026-01-01" }, "2026-01-02")).toBe(false);
    expect(isUnread({ at: "2026-01-01" }, null)).toBe(true);
  });
});

describe("delivery", () => {
  it("shows the delivery code only while out for delivery", () => {
    expect(showDeliveryOtp("dispatched", "4821")).toBe(true);
    expect(showDeliveryOtp("approved", "4821")).toBe(false);
    expect(showDeliveryOtp("dispatched", null)).toBe(false);
  });
  it("flags short, damaged and returned packs", () => {
    expect(lineIssues({ orderLineId: "a", delivered: 8, short: 1, damaged: 1, refused: 0, empties: 3 })).toEqual(["short", "damaged"]);
    expect(lineIssues({ orderLineId: "a", delivered: 10, short: 0, damaged: 0, refused: 2, empties: 0 })).toEqual(["returned"]);
  });
});
