import { describe, expect, it } from "vitest";
import { changedQty, countdown, isAllowedDate, matchesOrderFilter, orderFilterCounts, orderItemCounts, needsAction, paymentReady, quoteDateBounds, showTotal, sortForAction, statusTone, trackStep, whoKey } from "@/lib/quote-flow";

const now = new Date("2026-11-19T12:00:00Z"); // 19 Nov IST

describe("quote flow rules", () => {
  it("summarises six ordered products as six items and six packs", () => {
    expect(orderItemCounts(Array.from({ length: 6 }, (_, n) => ({ name: String(n), qty: 1, isFree: false })))).toEqual({ items: 6, packs: 6 });
    expect(orderItemCounts([{ name: "Water", qty: 3, isFree: false }, { name: "Gift", qty: 2, isFree: true }])).toEqual({ items: 1, packs: 3 });
  });
  it("shows the example 570 total only once the rate is known", () => {
    expect(showTotal("quote_requested", 570)).toBe(false);
    expect(showTotal("quote_sent", 570)).toBe(true);
    expect(showTotal("quote_sent", null)).toBe(false);
  });
  it("counts each filter using the same membership as its visible list", () => {
    const orders = [{ status: "quote_requested" }, { status: "quote_sent" }, { status: "dispatched" }, { status: "delivered" }];
    expect(orderFilterCounts(orders)).toEqual({ all: 4, action: 1, active: 3, done: 1 });
    expect(orderFilterCounts([])).toEqual({ all: 0, action: 0, active: 0, done: 0 });
    expect(orders.filter((o) => matchesOrderFilter(o.status, "action"))).toEqual([{ status: "quote_sent" }]);
  });
  it("default date is tomorrow, range today..+30", () => {
    expect(quoteDateBounds(now)).toEqual({ min: "2026-11-19", max: "2026-12-19", def: "2026-11-20" });
  });
  it("blocks dates after 30 days and before today", () => {
    expect(isAllowedDate("2026-12-19", now)).toBe(true);
    expect(isAllowedDate("2026-12-20", now)).toBe(false);
    expect(isAllowedDate("2026-11-18", now)).toBe(false);
  });
  it("action statuses", () => {
    for (const s of ["quote_sent", "quote_accepted", "payment_rejected", "quote_expired"]) expect(needsAction(s)).toBe(true);
    expect(needsAction("quote_requested")).toBe(false);
  });
  it("action orders come first", () => {
    const r = sortForAction([{ status: "delivered", createdAt: "2026-11-19" }, { status: "quote_sent", createdAt: "2026-11-01" }]);
    expect(r[0]?.status).toBe("quote_sent");
  });
  it("chip colours", () => {
    expect(statusTone("quote_requested")).toBe("amber");
    expect(statusTone("quote_sent")).toBe("blue");
    expect(statusTone("payment_submitted")).toBe("purple");
    expect(statusTone("dispatched")).toBe("teal");
    expect(statusTone("delivered")).toBe("green");
    expect(statusTone("quote_rejected")).toBe("grey");
  });
  it("tracking steps", () => {
    expect(trackStep("approved")).toBe(0);
    expect(trackStep("delivered")).toBe(4);
  });
  it("countdown", () => {
    expect(countdown("2026-11-21T11:12:30Z", now)).toEqual({ hours: 47, minutes: 12 });
    expect(countdown("2026-11-19T11:00:00Z", now)).toBeNull();
  });
  it("only changed paid lines are sent, never FREE lines", () => {
    const items = [
      { line_id: "a", name: "", pack_label: null, qty: 10, is_free: false, scheme: null, discount: null, rate: 1, total: 10 },
      { line_id: "b", name: "", pack_label: null, qty: 1, is_free: true, scheme: null, discount: null, rate: 0, total: 0 },
      { line_id: "c", name: "", pack_label: null, qty: 5, is_free: false, scheme: null, discount: null, rate: 1, total: 5 },
    ];
    expect(changedQty(items, { a: 12, b: 3, c: 5 })).toEqual([{ line_id: "a", qty: 12 }]);
    expect(changedQty(items, { c: 0 })).toEqual([{ line_id: "c", qty: 0 }]);
  });
  it("who labels", () => {
    expect(whoKey("customer")).toBe("you");
    expect(whoKey("salesman")).toBe("salesman");
    expect(whoKey("staff")).toBe("sunrich");
  });
  it("UTR required only when proof_required", () => {
    expect(paymentReady("upi", "", false, null)).toBe(true);
    expect(paymentReady("upi", "", true, null)).toBe(false);
    expect(paymentReady("upi", "TEST123", true, null)).toBe(true);
    expect(paymentReady("cash", "", true, null)).toBe(false);
    expect(paymentReady("cash", "", true, "office")).toBe(true);
  });
});
