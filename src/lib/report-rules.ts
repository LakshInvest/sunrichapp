import type { OrderDto, QuoteResult } from "@/lib/orders";
import { statusGroup } from "@/lib/orders";
import { istDayOf, istMonth, istShiftDay } from "@/lib/ist";
import type { KhataEntry } from "@/lib/khata";
import { statementTotals } from "@/lib/khata";

export function reportMonths(now = new Date(), count = 12): string[] {
  const first = istMonth(now) + "-01";
  const result = [first.slice(0, 7)];
  while (result.length < count) result.push(istShiftDay((result.at(-1) ?? first.slice(0, 7)) + "-01", -1).slice(0, 7));
  return result;
}
export type OrderFilters = { status: "all" | "active" | "delivered" | "cancelled"; range: "thisMonth" | "lastMonth" | "custom"; from: string; to: string; search: string };
export function filterOrderHistory(orders: OrderDto[], filters: OrderFilters, from: string, to: string): OrderDto[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return orders.filter((o) => {
    const day = istDayOf(o.createdAt);
    return !!day && day >= from && day <= to && (filters.status === "all" || statusGroup(o.status) === filters.status) && (!query || `${o.orderNo} ${o.lines.map((l) => `${l.productName} ${l.productCode}`).join(" ")}`.toLocaleLowerCase().includes(query));
  });
}
export function purchaseSummary(orders: OrderDto[], month: string, paidByOrder: Record<string, number>) {
  const list = orders.filter((o) => statusGroup(o.status) !== "cancelled" && istDayOf(o.createdAt)?.slice(0, 7) === month);
  const value = list.reduce((s, o) => s + o.grandTotal, 0);
  const paid = list.reduce((s, o) => s + Math.min(o.grandTotal, Math.max(0, paidByOrder[o.id] ?? o.paidAmount)), 0);
  const products = new Map<string, { id: string; name: string; packs: number; value: number; percent: number; orders: OrderDto[] }>();
  for (const order of list) for (const line of order.lines) {
    const row = products.get(line.productId) ?? { id: line.productId, name: line.productName, packs: 0, value: 0, percent: 0, orders: [] };
    row.packs += line.qty; row.value += line.lineTotal;
    if (!row.orders.some((o) => o.id === order.id)) row.orders.push(order);
    products.set(row.id, row);
  }
  const productTotal = [...products.values()].reduce((s, p) => s + p.value, 0);
  return { orders: list.length, packs: list.reduce((s, o) => s + o.lines.reduce((n, l) => n + l.qty, 0), 0), value, paid, due: Math.max(0, value - paid), products: [...products.values()].map((p) => ({ ...p, percent: productTotal > 0 ? p.value / productTotal * 100 : 0 })).sort((a, b) => b.value - a.value) };
}
export function paymentSummary(rows: KhataEntry[]) {
  const totals = statementTotals(rows);
  return { opening: totals.opening, bills: rows.filter((r) => r.kind === "bill").reduce((s, r) => s + r.debit, 0), paid: rows.filter((r) => r.kind === "payment").reduce((s, r) => s + r.credit, 0), credits: rows.filter((r) => r.rawType === "credit_note").reduce((s, r) => s + r.credit, 0), debits: rows.filter((r) => r.rawType === "debit_note").reduce((s, r) => s + r.debit, 0), closing: totals.closing };
}
/** Same distinct (firm_id, fulfiller_customer_id) grouping and whole-rupee rounding as _create_orders. */
export function quoteParts(quote: QuoteResult | null) {
  const groups = new Map<string, { key: string; firmId: string | null; fulfillerId: string | null; items: number; total: number }>();
  for (const l of quote?.lines ?? []) {
    const key = JSON.stringify([l.firm_id ?? null, l.fulfiller_customer_id || null]);
    const row = groups.get(key) ?? { key, firmId: l.firm_id ?? null, fulfillerId: l.fulfiller_customer_id || null, items: 0, total: 0 };
    row.items += l.qty; row.total += Number(l.line_total) + Number(l.deposit_total);
    groups.set(key, row);
  }
  return [...groups.values()].map((r) => ({ ...r, total: Math.round(r.total) }));
}