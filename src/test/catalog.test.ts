import { describe, expect, it, beforeEach } from "vitest";
import {
  addRecentSearch,
  clampQty,
  formatINR,
  loadCartPrices,
  loadRecentSearches,
  matchesSearch,
  priceSave,
  saveCartPrice,
  forgetCartPrice,
  type CatalogProduct,
} from "@/lib/catalogue";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "p1",
    code: "JAR-20L",
    categoryId: "c1",
    categoryCode: "JARS",
    brandName: "Sunrich",
    name: { en: "20 L Water Jar", hi: null, mr: null },
    description: null,
    packLabel: { en: "Single jar", hi: null, mr: null },
    sellUnit: null,
    unitsPerSellUnit: null,
    volumeMl: 20000,
    imageUrl: null,
    images: [],
    mrp: 100,
    price: 80,
    pickupPrice: 80,
    deliveredPrice: 90,
    defaultMode: "sunrich",
    depositAmount: 150,
    gstRate: 18,
    minOrderQty: 1,
    maxOrderQty: null,
    bulkThresholdQty: null,
    isReturnable: false,
    isPopular: false,
    isFavourite: false,
    sortOrder: 1,
    canOrder: true,
    ...overrides,
  };
}

describe("formatINR", () => {
  it("uses Indian digit grouping with ₹", () => {
    expect(formatINR(1234.5)).toBe("₹1,234.5");
    expect(formatINR(100000)).toBe("₹1,00,000");
  });
});

describe("priceSave", () => {
  it("returns the saving when MRP is higher", () => {
    expect(priceSave(product({ price: 80, mrp: 100 }))).toBe(20);
  });
  it("returns null when there is no saving or no price", () => {
    expect(priceSave(product({ price: 100, mrp: 100 }))).toBeNull();
    expect(priceSave(product({ price: null, mrp: 100 }))).toBeNull();
  });
});

describe("clampQty", () => {
  it("raises to min_order_qty and caps at max_order_qty", () => {
    const p = product({ minOrderQty: 2, maxOrderQty: 5 });
    expect(clampQty(p, 0)).toBe(0);
    expect(clampQty(p, 1)).toBe(2);
    expect(clampQty(p, 3)).toBe(3);
    expect(clampQty(p, 9)).toBe(5);
  });
});

describe("matchesSearch", () => {
  it("matches name in any language, code and pack label", () => {
    const p = product({ name: { en: "20 L Water Jar", hi: "20 लीटर जार", mr: "20 लिटर जार" } });
    expect(matchesSearch(p, "जार")).toBe(true);
    expect(matchesSearch(p, "jar")).toBe(true);
    expect(matchesSearch(p, "JAR-20L")).toBe(true);
    expect(matchesSearch(p, "single")).toBe(true);
    expect(matchesSearch(p, "bottle")).toBe(false);
  });
  it("matches every term", () => {
    const p = product();
    expect(matchesSearch(p, "water jar")).toBe(true);
    expect(matchesSearch(p, "water bottle")).toBe(false);
  });
});

describe("recent searches", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the last 5, newest first, without duplicates", () => {
    for (const q of ["jar", "bottle", "can", "soda", "lemon", "jar", "sparkling"]) addRecentSearch(q);
    const list = loadRecentSearches();
    expect(list).toEqual(["sparkling", "jar", "lemon", "soda", "can"]);
    expect(list.length).toBeLessThanOrEqual(5);
  });
});

describe("cart price snapshots", () => {
  beforeEach(() => localStorage.clear());

  it("stores and forgets prices", () => {
    saveCartPrice("p1", 80);
    expect(loadCartPrices()["p1"]).toBe(80);
    forgetCartPrice("p1");
    expect(loadCartPrices()["p1"]).toBeUndefined();
  });
});
