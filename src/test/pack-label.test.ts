import { describe, expect, it } from "vitest";
import { formatPack, lineShort, fixName } from "@/lib/pack-label";
describe("pack label", () => {
  it("pack shows count only, no size", () => expect(formatPack("Pack of 48 × 200 ml", 48)).toBe("Pack of 48"));
  it("box unit from CC", () => expect(formatPack("Box · 500 ml", 24, null, "box")).toBe("Box of 24"));
  it("single jar", () => expect(formatPack("Pack · 20 L", 1)).toBe("1 Jar"));
  it("order line", () => expect(lineShort("Pack of 24 × 500 ml", "Sunrich 500ml", 1)).toBe("500 ml × 1"));
  it("litre", () => expect(fixName("10 Liter")).toBe("10 Litre"));
});
