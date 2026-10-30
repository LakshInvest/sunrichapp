import { describe, expect, it } from "vitest";
import "@/lib/i18n";
import { dateLabel, dayAndDate } from "@/lib/order-format";
import { awaitingPayment, canChangePayMethod, paymentChip, successStatusKey } from "@/lib/payments";

const now = new Date("2026-10-30T12:00:00");

describe("friendly dates", () => {
  it("never shows raw ISO dates", () => {
    expect(dateLabel("2026-10-30", "en", now)).toBe("Today");
    expect(dateLabel("2026-10-31", "en", now)).toBe("Tomorrow");
    expect(dateLabel("2026-11-05", "en", now)).toBe("5 Nov");
    expect(dateLabel("2025-11-05", "en", now)).toMatch(/2025/);
    expect(dayAndDate("2026-10-31", "en", now)).toBe("Tomorrow, 31 Oct");
    expect(dateLabel("2026-10-31", "mr", now)).toBe("उद्या");
  });
});

describe("payment chips", () => {
  it("amber pending for UPI/bank, grey for cash/cheque/credit", () => {
    expect(paymentChip("upi", null)).toEqual({ key: "pending", tone: "amber" });
    expect(paymentChip("bank", "pending")).toEqual({ key: "checking", tone: "amber" });
    expect(paymentChip("cash", null)).toEqual({ key: "onDelivery", tone: "grey" });
    expect(paymentChip("cheque", null).tone).toBe("grey");
    expect(paymentChip("credit", null)).toEqual({ key: "onCredit", tone: "grey" });
  });
  it("never says Confirmed while a payment is pending", () => {
    expect(successStatusKey("approved", "upi", null)).toBe("status.placed");
    expect(successStatusKey("approved", "upi", "verified")).toBe("success.statusConfirmed");
    expect(successStatusKey("approved", "cash", null)).toBe("success.statusConfirmed");
  });
  it("pay later only while UPI/bank unpaid; method change until dispatch", () => {
    expect(awaitingPayment({ status: "placed", paymentMethod: "upi" }, null)).toBe(true);
    expect(awaitingPayment({ status: "placed", paymentMethod: "upi" }, "pending")).toBe(false);
    expect(awaitingPayment({ status: "placed", paymentMethod: "bank" }, "rejected")).toBe(true);
    expect(awaitingPayment({ status: "placed", paymentMethod: "cash" }, null)).toBe(false);
    expect(canChangePayMethod("approved")).toBe(true);
    expect(canChangePayMethod("dispatched")).toBe(false);
  });
});
