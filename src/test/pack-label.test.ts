import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import { formatPack, lineShort, fixName } from "@/lib/pack-label";
describe("pack label", () => {
  afterEach(async () => { await i18n.changeLanguage("en"); });
  it("48 bottles include 200 ml volume", () => expect(formatPack("Pack of 48 × 200 ml", 48)).toBe("Pack of 48 × 200 ml"));
  it("24 bottles include 500 ml volume", () => expect(formatPack("Box · 500 ml", 24, null, "box")).toBe("Pack of 24 × 500 ml"));
  it("12 bottles normalize 1000 ml to 1 L", () => expect(formatPack(null, 12, 1000)).toBe("Pack of 12 × 1 L"));
  it("known jar preserves its volume without a pack count", () => expect(formatPack("Jar · 10 L")).toBe("Jar · 10 L"));
  it("missing details never produce a lone Pack", () => expect(formatPack("Pack")).toBe(""));
  it("order snapshot recovers volume from product name", () => expect(formatPack("Pack of 24", null, null, null, "Sunrich 500 ml")).toBe("Pack of 24 × 500 ml"));
  it("single jar", () => expect(formatPack("Pack · 20 L", 1)).toBe("Jar · 20 L"));
  it("order line retains the full pack", () => expect(lineShort("Pack of 24 × 500 ml", "Sunrich 500ml", 1)).toBe("Pack of 24 × 500 ml × 1"));
  it("saved 1000 ml packs match catalogue litres", () => expect(formatPack("Pack of 12 × 1000 ml")).toBe("Pack of 12 × 1 L"));
  it.each(["hi", "mr"])("localized packs keep count and volume in %s", async (lang) => {
    await i18n.changeLanguage(lang);
    expect(formatPack("Pack of 48 × 200 ml", 48)).toBe(lang === "hi" ? "48 का पैक × 200 ml" : "48 चा पॅक × 200 ml");
  });
  it("litre", () => expect(fixName("10 Liter")).toBe("10 Litre"));
});
