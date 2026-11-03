import { describe, expect, it } from "vitest";
import { perUnit, rupees2 } from "@/lib/price-math";

describe("perUnit", () => {
  it("₹110 pack of 48 → ₹2.29 per bottle; MRP ₹240 → ₹5 per bottle; saving ₹130", () => {
    const r = perUnit({ price: 110, mrp: 240, unitsPerSellUnit: 48 });
    expect(rupees2(r.rate!)).toBe("₹2.29");
    expect(rupees2(r.mrp!)).toBe("₹5");
    expect(r.saving).toBe(130);
  });
  it("single unit has no per-bottle line", () => {
    expect(perUnit({ price: 50, mrp: 60, unitsPerSellUnit: 1 }).rate).toBeNull();
  });
});
