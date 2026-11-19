import { describe, expect, it } from "vitest";
import { changedQty, countdown, isAllowedDate, needsAction, paymentReady, quoteDateBounds, sortForAction, statusTone, trackStep, whoKey } from "@/lib/quote-flow";

const now = new Date("2026-11-19T12:00:00Z"); // 19 Nov IST

describe("quote flow rules", () => {
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
