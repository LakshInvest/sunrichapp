import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { callHref, fillFromGst, gstInactive, parseDispatch, showLivePin, showOnTheWay } from "@/lib/dispatch";
import { entryKind, entryLabel, entryTone } from "@/lib/khata";

const base = { status: "dispatched", vehicle_no: "MH24AB1234", driver_name: "Ravi", driver_mobile: "9876543210", transporter: "VRL", lr_no: "LR9", own_vehicle: false, live_location: false };

describe("on the way card", () => {
  it("transport vehicle: card shown, no live pin", () => {
    const d = parseDispatch(base);
    expect(showOnTheWay(d)).toBe(true);
    expect(showLivePin(d)).toBe(false);
  });
  it("own vehicle with live location shows the pin", () => {
    expect(showLivePin(parseDispatch({ ...base, own_vehicle: true, live_location: true }))).toBe(true);
  });
  it("call button hidden without mobile", () => {
    expect(callHref(parseDispatch({ ...base, driver_mobile: "" }))).toBeNull();
    expect(callHref(parseDispatch(base))).toBe("tel:9876543210");
  });
  it("not the customer's order → null", () => expect(parseDispatch(null)).toBeNull());
});

describe("bill GST details", () => {
  it("IRN/EWB only when present, sandbox tag", () => {
    const none = parseDispatch(base)!;
    expect(none.einvoice).toBeNull();
    expect(none.ewayBill).toBeNull();
    const d = parseDispatch({ ...base, challan_no: "DC1", einvoice: { irn: "abc", ack_no: "1", ack_date: "2026-11-01", signed_qr: "qr", sandbox: true }, eway_bill: { no: "EWB1", valid_till: "2026-11-03" } })!;
    expect(d.einvoice?.sandbox).toBe(true);
    expect(d.ewayBill?.no).toBe("EWB1");
    expect(d.challanNo).toBe("DC1");
  });
});

describe("khata entry types", () => {
  it("credit note green, debit note amber, unknown shows description", () => {
    expect(entryTone(entryKind("credit_note"))).toBe("text-success");
    expect(entryTone(entryKind("debit_note"))).toBe("text-warning");
    expect(entryLabel({ kind: entryKind("scheme_bonus"), rawType: "scheme_bonus", details: "Diwali bonus" })).toEqual({ text: "Diwali bonus" });
    expect(entryKind("advance")).toBe("advance");
  });
});

describe("GSTIN auto-fill", () => {
  const g = { legalName: "Legal", tradeName: "Trade", addressLine1: "A1", addressLine2: "A2", city: "Pune", pincode: "411001", status: "ACT", blocked: false };
  it("fills only empty fields", () => {
    const f = fillFromGst({ businessName: "Mine", addressLine1: "", addressLine2: "", city: "Latur", pincode: "", gstin: "x" }, g);
    expect(f).toMatchObject({ businessName: "Mine", addressLine1: "A1", addressLine2: "A2", city: "Latur", pincode: "411001" });
  });
  it("trade name else legal name; inactive flagged", () => {
    expect(fillFromGst({ businessName: "", addressLine1: "", addressLine2: "", city: "", pincode: "" }, { ...g, tradeName: null }).businessName).toBe("Legal");
    expect(gstInactive({ ...g, status: "CNL" })).toBe(true);
    expect(gstInactive(g)).toBe(false);
  });
  it("registration calls once per GSTIN value", () => {
    const src = readFileSync("src/routes/_authenticated/registration.tsx", "utf8");
    expect(src).toMatch(/gstTried\.current\.has\(g\)/);
  });
});

describe("home bundle split", () => {
  it("map/address editor is lazy-loaded from Home's address switcher", () => {
    const src = readFileSync("src/components/AddressSwitcher.tsx", "utf8");
    expect(src).not.toMatch(/^import .*AddressEditor/m);
    expect(src).toMatch(/lazy\(\(\) => import\("@\/components\/AddressEditor"\)/);
  });
});
