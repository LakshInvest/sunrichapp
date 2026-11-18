import { describe, expect, it } from "vitest";
import { schemeBenefits, schemeCovers, type Scheme } from "@/lib/scheme-rules";
import { planReorder } from "@/lib/feedback";
import type { OrderDto } from "@/lib/orders";
const product = { id: "p1", code: "WATER", categoryId: "c1", categoryCode: "BOTTLES" };
describe("scheme rules", () => {
  it("badges cover explicit products or categories, not unrelated products", () => {
    expect(schemeCovers({ products: ["p1"] } as Scheme, product)).toBe(true);
    expect(schemeCovers({ categories: [{ category_id: "c1" }] } as Scheme, product)).toBe(true);
    expect(schemeCovers({ categories: ["BOTTLES"] } as Scheme, product)).toBe(true);
    expect(schemeCovers({ products: ["other"], categories: ["other"] } as Scheme, product)).toBe(false);
  });
  it("benefits sum persisted discounts, not a recomputed percentage", () => {
    const orders = [{ status: "delivered", createdAt: "2026-11-02", lines: [{ qty: 10, discountAmount: 23, schemeInfo: [{ name: "5%", amount: 23, free_qty: 0 }] }, { qty: 1, isFree: true, discountAmount: 0, schemeInfo: [{ name: "10+1", amount: 0, free_qty: 1 }] }] }] as unknown as OrderDto[];
    expect(schemeBenefits(orders, "2026-11")).toEqual({ saved: 23, freePacks: 1, schemes: [{ name: "5%", saved: 23, freePacks: 0 }, { name: "10+1", saved: 0, freePacks: 1 }] });
  });
  it("cancelled and rejected orders do not count toward benefits", () => {
    const orders = ["cancelled", "rejected", "approved"].map((status) => ({ status, createdAt: "2026-11-01", lines: [{ qty: 2, isFree: true, discountAmount: 5 }] })) as OrderDto[];
    expect(schemeBenefits(orders, "2026-11").saved).toBe(5);
    expect(schemeBenefits(orders, "2026-11").freePacks).toBe(2);
  });
  it("monthly benefits use IST and exclude other months", () => {
    const orders = [{ status: "delivered", createdAt: "2026-10-31T20:00:00Z", lines: [{ discountAmount: 7 }] }, { status: "delivered", createdAt: "2026-10-15", lines: [{ discountAmount: 50 }] }] as OrderDto[];
    expect(schemeBenefits(orders, "2026-11").saved).toBe(7);
  });
  it("reordering never converts server free packs into paid packs", () => {
    const result = planReorder([{ productId: "p1", qty: 10 }, { productId: "p1", qty: 1, isFree: true }], [{ id: "p1", price: 100, canOrder: true, minOrderQty: 1, maxOrderQty: null }]);
    expect(result.add).toEqual([{ productId: "p1", qty: 10 }]);
  });
});