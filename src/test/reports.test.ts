import { describe, expect, it } from "vitest";
import { filterOrderHistory, paymentSummary, purchaseSummary, quoteParts, reportMonths } from "@/lib/report-rules";
import { entryKind, type KhataEntry } from "@/lib/khata";
import type { OrderDto, QuoteResult } from "@/lib/orders";
const order = (id: string, status: string, date: string, qty: number, value: number) => ({ id, status, createdAt: date, orderNo: `SUN/${id}`, grandTotal: value, paidAmount: 0, lines: [{ productId: id, productName: `Water ${id}`, productCode: id, qty, lineTotal: value }] }) as OrderDto;
describe("customer reports", () => {
  it("offers this month and the previous eleven months", () => {
    const months = reportMonths(new Date("2026-11-18T04:45:00Z"));
    expect(months).toHaveLength(12); expect(months[0]).toBe("2026-11"); expect(months[11]).toBe("2025-12");
  });
  it("chart covers six calendar months", () => { expect(reportMonths(new Date("2026-11-18T04:45:00Z"), 6)).toEqual(["2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06"]); });
  it("excludes cancelled purchases and uses paid invoices for due", () => {
    const result = purchaseSummary([order("a", "delivered", "2026-11-01", 3, 330), order("b", "approved", "2026-11-02", 2, 220), order("c", "cancelled", "2026-11-03", 9, 990)], "2026-11", { a: 330, b: 50 });
    expect([result.orders, result.packs, result.value, result.paid, result.due]).toEqual([2, 5, 550, 380, 170]);
    expect(result.products.map((p) => p.value)).toEqual([330, 220]); expect(result.products[0]?.percent).toBe(60); expect(result.products[0]?.orders[0]?.id).toBe("a");
  });
  it("uses IST order month", () => { expect(purchaseSummary([order("a", "delivered", "2026-10-31T20:00:00Z", 1, 110)], "2026-11", {}).orders).toBe(1); });
  it("balance includes notes exactly once, matching the statement", () => {
    const entries: Partial<KhataEntry>[] = [{ kind: "opening", refNo: "", debit: 100, credit: 0, balance: 100 }, { kind: "bill", debit: 330, credit: 0, balance: 430 }, { kind: "credit", rawType: "credit_note", debit: 0, credit: 50, balance: 380 }, { kind: "debit", rawType: "debit_note", debit: 20, credit: 0, balance: 400 }, { kind: "payment", debit: 0, credit: 200, balance: 200 }];
    const rows: KhataEntry[] = entries.map((r) => ({ date: "2026-11-01", kind: "bill", rawType: "invoice", refNo: "", details: "", debit: 0, credit: 0, balance: 0, invoiceId: null, orderId: null, ...r }));
    expect(paymentSummary(rows)).toEqual({ opening: 100, bills: 330, paid: 200, credits: 50, debits: 20, closing: 200 });
    expect(entryKind("credit_note")).toBe("credit"); expect(entryKind("debit_note")).toBe("debit");
  });
  it("split preview groups by both firm and fulfiller, rounding like the backend", () => {
    const quote = { lines: [{ firm_id: "firm1", fulfiller_customer_id: null, qty: 2, line_total: 220.2, deposit_total: 0 }, { firm_id: "firm1", fulfiller_customer_id: "distributor", qty: 1, line_total: 110, deposit_total: 0 }, { firm_id: "firm2", fulfiller_customer_id: null, qty: 3, line_total: 330.8, deposit_total: 0 }] } as QuoteResult;
    expect(quoteParts(quote).map((p) => [p.items, p.total])).toEqual([[2, 220], [1, 110], [3, 331]]);
    expect(quoteParts({ lines: [quote.lines[0], quote.lines[0]] } as QuoteResult)).toHaveLength(1);
  });
  it("filters by status, date and product or order number", () => {
    const orders = [order("a", "dispatched", "2026-11-01", 1, 110), order("b", "closed", "2026-10-01", 1, 110), order("c", "cancelled", "2026-11-01", 1, 110)];
    const filters = { status: "all", range: "thisMonth", from: "", to: "", search: "water a" } as const;
    expect(filterOrderHistory(orders, filters, "2026-11-01", "2026-11-30").map((o) => o.id)).toEqual(["a"]);
    expect(filterOrderHistory(orders, { ...filters, status: "cancelled", search: "SUN/c" }, "2026-11-01", "2026-11-30").map((o) => o.id)).toEqual(["c"]);
    expect(filterOrderHistory(orders, { ...filters, status: "delivered", search: "" }, "2026-10-01", "2026-10-31").map((o) => o.id)).toEqual(["b"]);
  });
});