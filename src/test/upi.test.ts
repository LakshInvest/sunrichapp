import { describe, expect, it } from "vitest";
import { outcomeOf, upiLink } from "@/lib/upi";

describe("upiLink", () => {
  const link = upiLink({ pa: "Q507766276@ybl", pn: "Sunrich Foods", amount: 440, orderNo: "MFO/26-27/00070" });
  it("writes pa with a plain @, not %40", () => {
    expect(link).toContain("pa=Q507766276@ybl");
    expect(link).not.toContain("%40");
  });
  it("has no tr parameter", () => {
    expect(link).not.toMatch(/[?&]tr=/);
  });
  it("keeps pn, 2-decimal am, INR and Order <no>", () => {
    const u = new URL(link.replace("upi://", "https://x/"));
    expect(u.searchParams.get("pn")).toBe("Sunrich Foods");
    expect(u.searchParams.get("am")).toBe("440.00");
    expect(u.searchParams.get("cu")).toBe("INR");
    expect(u.searchParams.get("tn")).toBe("Order MFO/26-27/00070");
  });
});

describe("UPI app reply", () => {
  it("SUCCESS with a 12-digit ApprovalRefNo gives the UTR", () => {
    const o = outcomeOf("txnId=AXI123&responseCode=00&Status=SUCCESS&ApprovalRefNo=412345678901");
    expect(o.kind).toBe("success");
    expect(o.kind === "success" && o.response.utr).toBe("412345678901");
  });
  it("FAILURE is failed", () => {
    expect(outcomeOf("Status=FAILURE&responseCode=ZD").kind).toBe("failed");
  });
  it("SUCCESS without a UTR falls back to the manual sheet", () => {
    expect(outcomeOf("Status=SUCCESS&txnId=1").kind).toBe("none");
  });
  it("no reply falls back to the manual sheet", () => {
    expect(outcomeOf(null).kind).toBe("none");
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
