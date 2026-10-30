import { describe, expect, it } from "vitest";
import { arrangeCatalogue, type CatalogCategory, type CatalogProduct } from "@/lib/catalogue";

const cat = (code: string, sortOrder: number) => ({ id: code, code, sortOrder, name: { en: code, hi: null, mr: null }, iconKey: "grid", imageUrl: null }) as CatalogCategory;
const prod = (id: string, categoryCode: string, sortOrder: number) => ({ id, categoryCode, sortOrder }) as CatalogProduct;

describe("arrangeCatalogue", () => {
  const out = arrangeCatalogue({
    categories: [cat("bottle", 2), cat("jar", 1), cat("empty", 0)],
    products: [prod("b2", "bottle", 2), prod("j1", "jar", 5), prod("b1", "bottle", 1), prod("j0", "jar", 3)],
  });

  it("orders products by category sort_order, then product sort_order", () => {
    expect(out.products.map((p) => p.id)).toEqual(["j0", "j1", "b1", "b2"]);
  });

  it("hides categories with no products", () => {
    expect(out.categories.map((c) => c.code)).toEqual(["jar", "bottle"]);
  });
});
