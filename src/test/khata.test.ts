import { describe, expect, it } from "vitest";
import { advanceAtCheckout, balanceTone, filterEntries, khataRange, passbookRows, payChoices, statementTotals, validPayAmount, type KhataEntry } from "@/lib/khata";
import { paymentNotice } from "@/lib/notifications";

const e = (p: Partial<KhataEntry>): KhataEntry => ({
  date: "2026-11-01", kind: "bill", rawType: "invoice", refNo: "B1", details: "", debit: 0, credit: 0, balance: 0, invoiceId: null, orderId: null, ...p,
});

describe("Khata balance card", () => {
  it("money due shows as due", () => expect(balanceTone(12400)).toBe("due"));
  it("paid extra shows as advance", () => expect(balanceTone(-500)).toBe("advance"));
  it("nothing due shows all clear", () => expect(balanceTone(0)).toBe("clear"));
});

describe("Pay now amounts", () => {
  it("offers full due and only-overdue", () => expect(payChoices({ balance: 1000, overdue: 400 })).toEqual({ full: 1000, overdue: 400 }));
  it("hides only-overdue when nothing is overdue", () => expect(payChoices({ balance: 1000, overdue: 0 }).overdue).toBeNull());
  it("no full-due choice when in advance", () => expect(payChoices({ balance: -200, overdue: 0 }).full).toBeNull());
  it("any amount above zero is allowed, including more than the due", () => {
    expect(validPayAmount(5000)).toBe(true);
    expect(validPayAmount(0)).toBe(false);
  });
});

describe("Advance at checkout", () => {
  it("uses advance up to the order total", () => expect(advanceAtCheckout(1000, 300)).toEqual({ used: 300, payable: 700 }));
  it("never uses more than the total", () => expect(advanceAtCheckout(200, 500)).toEqual({ used: 200, payable: 0 }));
  it("no advance, nothing used", () => expect(advanceAtCheckout(200, 0)).toEqual({ used: 0, payable: 200 }));
});

describe("Passbook and statement", () => {
  const rows = [
    e({ kind: "opening", rawType: "opening", refNo: "", debit: 100, balance: 100 }),
    e({ kind: "bill", refNo: "B1", debit: 500, balance: 600 }),
    e({ kind: "payment", rawType: "receipt", refNo: "R1", credit: 250, balance: 350 }),
  ];
  it("lists newest first without the opening row", () => expect(passbookRows(rows).map((r) => r.refNo)).toEqual(["R1", "B1"]));
  it("filters bills and payments", () => {
    expect(filterEntries(passbookRows(rows), "bills").map((r) => r.refNo)).toEqual(["B1"]);
    expect(filterEntries(passbookRows(rows), "payments").map((r) => r.refNo)).toEqual(["R1"]);
  });
  it("statement totals tie out: opening + bills − payments = closing", () => {
    const t = statementTotals(rows);
    expect(t).toEqual({ opening: 100, debit: 500, credit: 250, closing: 350 });
    expect(t.opening + t.debit - t.credit).toBe(t.closing);
  });
  it("last 3 months starts on the 1st two months back", () => expect(khataRange("last3", new Date(2026, 10, 15)).from).toBe("2026-09-01"));
});

describe("Payment notices", () => {
  it("verified shows amount and new balance", () => {
    const n = paymentNotice({ id: "1", amount: 500, reference: "U", status: "verified", reject_reason: null, balance_after: 1200, reviewed_at: "2026-11-01" });
    expect(n.kind).toBe("pay_verified");
    expect(n.params?.["balance"]).toContain("1,200");
  });
  it("verified overpayment shows the advance, not a negative balance", () => {
    const n = paymentNotice({ id: "3", amount: 300, reference: null, status: "verified", reject_reason: null, balance_after: -140, reviewed_at: "2026-11-01" });
    expect(n.kind).toBe("pay_verified_adv");
    expect(n.params?.["balance"]).toBe("₹140");
  });
  it("rejected shows the reason", () => {
    const n = paymentNotice({ id: "2", amount: 500, reference: null, status: "rejected", reject_reason: "Wrong UTR", balance_after: null, reviewed_at: "2026-11-01" });
    expect(n.kind).toBe("pay_rejected");
    expect(n.params?.["reason"]).toBe("Wrong UTR");
  });
});
