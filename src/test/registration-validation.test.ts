import { describe, expect, it } from "vitest";
import { isValidGstin, isValidPincode } from "@/lib/registration-validation";

// Rules from the registration prompt: 6-digit pincode, valid GST format when entered.
describe("registration validation", () => {
  it("accepts 6-digit pincodes only", () => {
    expect(isValidPincode("411014")).toBe(true);
    expect(isValidPincode("41101")).toBe(false);
    expect(isValidPincode("4110145")).toBe(false);
    expect(isValidPincode("41a014")).toBe(false);
    expect(isValidPincode("")).toBe(false);
  });

  it("accepts well-formed GST numbers and rejects the rest", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin(" 27aapfu0939f1zv ")).toBe(true);
    expect(isValidGstin("27AAPFU0939F1Z")).toBe(false);
    expect(isValidGstin("27AAPFU0939F1ZVW")).toBe(false);
    expect(isValidGstin("")).toBe(false);
  });
});
