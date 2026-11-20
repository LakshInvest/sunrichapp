import { describe, expect, it } from "vitest";
import { showRejectedCard, type KhataProof } from "@/lib/khata";
import { pickBanners } from "@/lib/catalogue";

const proof = (o: Partial<KhataProof>): KhataProof => ({
  id: "p1", amount: 12000, method: "upi", reference: null, paidOn: "2026-11-01", status: "rejected",
  rejectReason: "x", balanceAfter: null, reviewedAt: "2026-11-10T00:00:00Z", createdAt: "2026-11-10T00:00:00Z",
  orderId: "o1", orderStatus: "payment_rejected", ...o,
});

describe("rejected payment card", () => {
  it("shows while the order still needs payment", () => {
    const p = proof({});
    expect(showRejectedCard(p, [p], new Set())).toBe(true);
  });
  it("hides when the order is paid or cancelled", () => {
    expect(showRejectedCard(proof({ orderStatus: "paid" }), [], new Set())).toBe(false);
    expect(showRejectedCard(proof({ orderStatus: "cancelled" }), [], new Set())).toBe(false);
  });
  it("hides when another proof for the same order is verified", () => {
    const p = proof({});
    expect(showRejectedCard(p, [p, proof({ id: "p2", status: "verified" })], new Set())).toBe(false);
  });
  it("hides after the customer taps Hide", () => {
    expect(showRejectedCard(proof({}), [], new Set(["p1"]))).toBe(false);
  });
});

describe("home banners", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  it("shows every active banner in saved order, empty end = no end", () => {
    const rows = [
      { id: "b", sort_order: 2, image_url: "https://x/b", end_at: null },
      { id: "a", sort_order: 1, image_url: "https://x/a", customer_type_ids: ["t1"] },
      { id: "c", sort_order: 3, image_url: "https://x/c" },
    ];
    expect(pickBanners(rows, null, now).map((b) => b["id"])).toEqual(["a", "b", "c"]);
  });
  it("skips banners without an image or past their end", () => {
    const rows = [{ id: "a", image_url: "" }, { id: "b", image_url: "https://x", end_at: "2026-11-19T00:00:00Z" }];
    expect(pickBanners(rows, null, now)).toEqual([]);
  });
});
