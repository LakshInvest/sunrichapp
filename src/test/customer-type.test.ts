import { describe, expect, it } from "vitest";
import { isBusinessType } from "@/lib/customer-type";

describe("isBusinessType", () => {
  it("Retailer, Distributor, HORECA and Institution see Margin", () => {
    for (const c of ["RETAILER", "DISTRIBUTOR", "HORECA", "INSTITUTION"]) expect(isBusinessType(c)).toBe(true);
  });
  it("Home customers see Save", () => {
    expect(isBusinessType("HOME")).toBe(false);
    expect(isBusinessType(null)).toBe(false);
  });
});
