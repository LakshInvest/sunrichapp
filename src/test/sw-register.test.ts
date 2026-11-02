import { describe, expect, it } from "vitest";
import { swAllowed } from "@/lib/sw-register";

describe("service worker guard", () => {
  it("registers on the published domains", () => {
    expect(swAllowed("user.sunrich.in", "", true, false)).toBe(true);
    expect(swAllowed("sunrichapp.lovable.app", "", true, false)).toBe(true);
  });
  it("never registers in previews, dev, iframes or with ?sw=off", () => {
    expect(swAllowed("id-preview--15f0a66a-24b6-4e00-8874-bc0bdbe0b620.lovable.app", "", true, false)).toBe(false);
    expect(swAllowed("user.sunrich.in", "", false, false)).toBe(false);
    expect(swAllowed("user.sunrich.in", "", true, true)).toBe(false);
    expect(swAllowed("user.sunrich.in", "?sw=off", true, false)).toBe(false);
    expect(swAllowed("abc.lovableproject.com", "", true, false)).toBe(false);
  });
});
