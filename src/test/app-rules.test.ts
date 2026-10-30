import { describe, expect, it } from "vitest";
import { canCustomerCancel, deliveryDays, minOrderShortfall, waLink } from "@/lib/app-settings";
import { planReorder } from "@/lib/feedback";

describe("minimum order value", () => {
  it("asks for the remaining amount below the minimum", () => {
    expect(minOrderShortfall(350, 500)).toBe(150);
  });
  it("allows checkout at or above the minimum, or with no minimum", () => {
    expect(minOrderShortfall(500, 500)).toBe(0);
    expect(minOrderShortfall(10, 0)).toBe(0);
  });
});

describe("customer cancel window", () => {
  it("allows cancelling up to the configured status", () => {
    expect(canCustomerCancel("approved", "approved")).toBe(true);
    expect(canCustomerCancel("processing", "approved")).toBe(false);
  });
  it("never allows cancelling dispatched orders", () => {
    expect(canCustomerCancel("dispatched", "processing")).toBe(false);
  });
});

describe("delivery days", () => {
  it("marks closed weekdays and holidays as closed", () => {
    // Friday 2026-01-02 10:00; Sunday (0) closed; 2026-01-03 holiday
    const days = deliveryDays(
      { deliveryDaysAhead: 3, sameDayCutoff: "23:00", closedWeekdays: [0], holidays: ["2026-01-03"] },
      new Date(2026, 0, 2, 10, 0),
    );
    const closed = days.filter((d) => d.closed).map((d) => d.iso);
    expect(closed).toContain("2026-01-03");
    expect(closed).toContain("2026-01-04");
  });
  it("skips today after the same-day cutoff", () => {
    const days = deliveryDays(
      { deliveryDaysAhead: 2, sameDayCutoff: "09:00", closedWeekdays: [], holidays: [] },
      new Date(2026, 0, 2, 10, 0),
    );
    expect(days.some((d) => d.iso === "2026-01-02" && !d.closed)).toBe(false);
  });
});

describe("re-order", () => {
  const products = [
    { id: "a", canOrder: true, minOrderQty: 2, maxOrderQty: 10, price: 20 },
    { id: "b", canOrder: false, minOrderQty: 1, maxOrderQty: null, price: 30 },
  ];
  it("skips unavailable products and clamps quantities", () => {
    const r = planReorder(
      [
        { productId: "a", qty: 1 },
        { productId: "b", qty: 3 },
        { productId: "gone", qty: 1 },
      ],
      products,
    );
    expect(r.add).toEqual([{ productId: "a", qty: 2 }]);
    expect(r.skipped).toBe(2);
  });
});

describe("WhatsApp link", () => {
  it("adds India code to 10-digit numbers", () => {
    expect(waLink("98765 43210", "hi")).toBe("https://wa.me/919876543210?text=hi");
  });
});
