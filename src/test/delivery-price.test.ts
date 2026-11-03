import { describe, it, expect } from "vitest";
import { modePrices } from "@/lib/catalogue";

describe("delivery charge in the rate", () => {
  it("delivery customer sees plan price + ₹10 per pack", () => {
    const r = modePrices({ price: 110, pickup_price: 110, delivered_price: 120, delivery_charge_per_pack: 10, default_delivery_mode: "sunrich" });
    expect(r.price).toBe(120);
  });
  it("pickup customer sees the plan price", () => {
    const r = modePrices({ price: 110, pickup_price: 110, delivered_price: 120, default_delivery_mode: "pickup" });
    expect(r.price).toBe(110);
  });
  it("computes delivered rate from charge when missing", () => {
    expect(modePrices({ price: 110, delivery_charge_per_pack: 10 }).deliveredPrice).toBe(120);
  });
  it("unpriced product stays unpriced", () => {
    expect(modePrices({ price: null, delivered_price: 10 }).price).toBeNull();
  });
});
