import { describe, expect, it, vi } from "vitest";
import type { AppInfo } from "@/lib/app-info";
vi.mock("@/lib/app-info", () => ({ fetchAppInfo: vi.fn() }));
import { brandFromInfo } from "@/lib/brand";
import whiteLogo from "@/assets/brand/sunrich-logo-white.png.asset.json";

const info: AppInfo = {
  company: "Sunrich", address: "", supportEmail: null, supportPhone: null,
  supportWhatsapp: null, privacyMd: "", termsMd: "", minVersion: null,
  latestVersion: null, playStoreUrl: null, maintenance: null, brandPrimary: null,
  brandAccent: null, logoOnLightUrl: null, logoOnDarkUrl: null,
  loginTagline: { en: null, hi: null, mr: null },
};
describe("photo wordmark source", () => {
  it("prefers the uploaded white logo over the regular logo", () => {
    expect(brandFromInfo({ ...info, logoOnDarkUrl: "https://example.com/white.png", logoOnLightUrl: "https://example.com/navy.png" }, "en", "https://example.com/app.png").logoDark).toBe("https://example.com/white.png");
  });
  it("uses the App look logo when no white upload exists", () => {
    expect(brandFromInfo(info, "en", "https://example.com/app.png").logoDark).toBe("https://example.com/app.png");
  });
  it("uses the existing regular logo when no white or photo logo exists", () => {
    expect(brandFromInfo({ ...info, logoOnLightUrl: "https://example.com/navy.png" }, "en").logoDark).toBe("https://example.com/navy.png");
  });
  it("retains a real image when all logo settings are missing", () => {
    expect(brandFromInfo(info, "en").logoDark).toBe(whiteLogo.url);
  });
});