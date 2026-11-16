import { describe, expect, it } from "vitest";
import { brandVisibility, cacheBrandPhotos } from "@/lib/brand-photos";
import { paymentReportReason } from "@/lib/form-errors";

describe("pre-login branding flags", () => {
  for (const [setting, flag] of [
    ["launch_show_logo", "launchShowLogo"],
    ["launch_show_tagline", "launchShowTagline"],
    ["login_show_logo", "loginShowLogo"],
    ["login_show_tagline", "loginShowTagline"],
  ] as const) {
    it(`${setting} defaults to true`, () => expect(brandVisibility()[flag]).toBe(true));
    it(`${setting} respects false`, () => expect(brandVisibility({ [setting]: false })[flag]).toBe(false));
  }
  it("caches false flags with the photo for the next launch", () => {
    cacheBrandPhotos({ login: "https://example.com/login.jpg", launch: null, hero: null, visibility: brandVisibility({ login_show_logo: false, launch_show_tagline: false }) });
    expect(localStorage.getItem("sunrich.loginImg")).toBe("https://example.com/login.jpg");
    expect(JSON.parse(localStorage.getItem("sunrich.brandVisibility") ?? "{}")).toMatchObject({ loginShowLogo: false, launchShowTagline: false });
  });
});

describe("payment rejection classification", () => {
  it("identifies the daily report limit", () => expect(paymentReportReason(new Error("Too many payment reports today. Please contact support."))).toBe("dailyLimit"));
  it("identifies an already reported payment", () => expect(paymentReportReason(new Error("This payment is already reported"))).toBe("duplicate"));
  it("does not mislabel unknown failures as a report limit", () => expect(paymentReportReason(new Error("Not allowed"))).toBeNull());
});