import { describe, expect, it } from "vitest";
import { isDarkTop } from "@/lib/status-bar";

describe("status bar icons", () => {
  it("uses light icons over the dark Home hero", () => expect(isDarkTop("/home")).toBe(true));
  it("uses dark icons on Shop, Orders, Account and Order detail", () => {
    for (const p of ["/order", "/track", "/account", "/track/abc"]) expect(isDarkTop(p)).toBe(false);
  });
});
