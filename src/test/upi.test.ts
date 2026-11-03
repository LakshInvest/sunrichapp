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

import { kmBetween } from "@/lib/delivery";
describe("kmBetween", () => {
  it("Latur Ganj Golai to MIDC is a few km", () => {
    const d = kmBetween({ lat: 18.4022, lng: 76.5842 }, { lat: 18.4319, lng: 76.5469 });
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(6);
  });
});
