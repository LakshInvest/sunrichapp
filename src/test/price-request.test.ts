import { describe, expect, it } from "vitest";
import {
  decodeProductChip,
  encodeProductChip,
  isPriceRequestSubject,
  parsePriceRequestSubject,
  priceRequestSubject,
} from "@/lib/price-request";
import { serverMessage } from "@/lib/form-errors";
import type { CatalogProduct } from "@/lib/catalogue";

const priced = {
  id: "81ea4b1c-6381-4d5a-9c5f-495cce797a03",
  code: "1L",
  categoryId: null,
  categoryCode: "bottles",
  brandName: "Sunrich",
  name: { en: "1 Litre", hi: null, mr: null },
  description: null,
  packLabel: { en: "Pack of 12 × 1 L", hi: null, mr: null },
  sellUnit: "pack",
  unitsPerSellUnit: 12,
  volumeMl: 1000,
  imageUrl: null,
  images: [],
  mrp: 240,
  price: 110,
  pickupPrice: 110,
  deliveredPrice: 120,
  defaultMode: "sunrich",
  depositAmount: null,
  gstRate: 18,
  minOrderQty: 1,
  maxOrderQty: null,
  bulkThresholdQty: null,
  isReturnable: false,
  isPopular: true,
  isFavourite: false,
  sortOrder: 0,
  canOrder: true,
} as CatalogProduct;

describe("price request subject", () => {
  it("builds a canonical subject with name and pack", () => {
    expect(priceRequestSubject(priced)).toBe("Price request: 1 Litre (Pack of 12 × 1 L)");
  });

  it("round-trips through the parser", () => {
    const subject = priceRequestSubject(priced);
    expect(parsePriceRequestSubject(subject)?.label).toBe("1 Litre (Pack of 12 × 1 L)");
    expect(isPriceRequestSubject(subject)).toBe(true);
    expect(isPriceRequestSubject("Order 00027 damaged pack")).toBe(false);
    expect(parsePriceRequestSubject("Price request: ")).toBeNull();
  });

  it("caps the subject at the database limit of 120 chars", () => {
    const long = { ...priced, name: { en: "X".repeat(300), hi: null, mr: null }, packLabel: null } as CatalogProduct;
    const subject = priceRequestSubject(long);
    expect(subject.length).toBeLessThanOrEqual(120);
    expect(subject.startsWith("Price request: ")).toBe(true);
  });

  it("encodes and decodes the product chip", () => {
    const chip = decodeProductChip(encodeProductChip(priced));
    expect(chip).toEqual({ id: priced.id, name: "1 Litre", pack: "Pack of 12 × 1 L" });
    expect(decodeProductChip(undefined)).toBeNull();
    expect(decodeProductChip("not-a-chip")).toBeNull();
  });
});

describe("unpriced-line server rejection", () => {
  it("maps the pricing engine's 'No price set for' errors to the friendly price message", () => {
    expect(serverMessage(new Error("No price set for 1 Litre"), "fallback")).toBe(
      "Some items don't have a price yet. Please remove them and try again.",
    );
  });
});
