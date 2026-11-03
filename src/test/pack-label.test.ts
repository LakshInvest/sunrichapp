import { describe, expect, it } from "vitest";
import { formatPack, lineShort, fixName } from "@/lib/pack-label";
describe("pack label", () => {
  it("multi pack", () => expect(formatPack("Pack of 12 × 1 L", 12)).toBe("Pack of 12 × 1 L"));
  it("pack of 2", () => expect(formatPack("Pack of 2 · 5 L")).toBe("Pack of 2 × 5 L"));
  it("single jar", () => expect(formatPack("Pack · 10 L", 1)).toBe("1 jar · 10 L"));
  it("order line", () => expect(lineShort("Pack of 24 × 500 ml", "Sunrich 500ml", 1)).toBe("500 ml × 1"));
  it("litre", () => expect(fixName("10 Liter")).toBe("10 Litre"));
});
