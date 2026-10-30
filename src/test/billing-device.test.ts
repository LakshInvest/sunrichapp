import { describe, expect, it, beforeEach } from "vitest";
import { amountInWords } from "@/lib/amount-words";
import { monthRange } from "@/lib/billing";
import { getDeviceId, getLastMobile, setLastMobile } from "@/lib/device";

describe("amount in words (Indian system)", () => {
  it("uses lakh and paise", () => {
    expect(amountInWords(125050.5)).toBe("Rupees One Lakh Twenty Five Thousand Fifty and Fifty Paise Only");
  });
  it("uses crore", () => {
    expect(amountInWords(20000000)).toBe("Rupees Two Crore Only");
  });
});

describe("statement month range", () => {
  it("covers February in a leap year", () => {
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("device identity survives", () => {
  beforeEach(() => localStorage.clear());
  it("never saves a blank last mobile", () => {
    setLastMobile("9876543210");
    expect(setLastMobile("")).toBe(false);
    expect(getLastMobile()).toBe("9876543210");
  });
  it("keeps the same device id and restores it from the cookie backup", () => {
    const id = getDeviceId();
    expect(getDeviceId()).toBe(id);
    localStorage.removeItem("sunrich_device_id");
    expect(getDeviceId()).toBe(id);
  });
});
