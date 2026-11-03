import { describe, expect, it } from "vitest";
import { upiLink } from "@/lib/upi";

describe("upiLink", () => {
  it("has pa, pn, 2-decimal am, INR, Order <no> and a clean ref", () => {
    const u = new URL(upiLink({ pa: "sunrich@hdfc", pn: "Sunrich Foods", amount: 440, orderNo: "MFO/26-27/00070", ref: "MFO/26-27/00070x1" }).replace("upi://", "https://x/"));
    expect(u.searchParams.get("pa")).toBe("sunrich@hdfc");
    expect(u.searchParams.get("pn")).toBe("Sunrich Foods");
    expect(u.searchParams.get("am")).toBe("440.00");
    expect(u.searchParams.get("cu")).toBe("INR");
    expect(u.searchParams.get("tn")).toBe("Order MFO/26-27/00070");
    expect(u.searchParams.get("tr")).toBe("MFO262700070x1");
  });
});
