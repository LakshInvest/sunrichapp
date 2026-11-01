/** Khata (customer ledger & payments) — reads/writes through the Khata RPCs only. */
import { supabase } from "@/integrations/supabase/client";
import { getMyCustomerId } from "@/lib/orders";

export type KhataSummary = {
  due: number;
  advance: number;
  /** > 0 money due, < 0 advance, 0 all clear. */
  balance: number;
  creditLimit: number;
  available: number;
  overdue: number;
  oldestUnpaid: string | null;
  pendingPayments: number;
};

export type KhataEntryKind = "bill" | "payment" | "credit" | "adjustment" | "opening";
export type KhataEntry = {
  date: string;
  kind: KhataEntryKind;
  rawType: string;
  refNo: string;
  details: string;
  debit: number;
  credit: number;
  balance: number;
  invoiceId: string | null;
  orderId: string | null;
};

export type KhataProof = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paidOn: string;
  status: "pending" | "verified" | "rejected";
  rejectReason: string | null;
  balanceAfter: number | null;
  reviewedAt: string | null;
  createdAt: string;
};

const n = (v: unknown) => Number(v ?? 0) || 0;
const round2 = (v: number) => Math.round(v * 100) / 100;

/* ---------- Pure rules (tested) ---------- */

/** Big balance card tone: due (red), advance (green), all clear. */
export function balanceTone(balance: number): "due" | "advance" | "clear" {
  const b = round2(balance);
  if (b > 0) return "due";
  if (b < 0) return "advance";
  return "clear";
}

/** Pay-now amount choices: full due always (when > 0), "only overdue" only when overdue > 0 and less than full due. */
export function payChoices(s: Pick<KhataSummary, "balance" | "overdue">): { full: number | null; overdue: number | null } {
  const full = s.balance > 0 ? round2(s.balance) : null;
  const overdue = s.overdue > 0 && (full === null || s.overdue < full) ? round2(s.overdue) : null;
  return { full, overdue };
}

/** Any amount > 0 is allowed; more than the due becomes advance. */
export function validPayAmount(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

/** Checkout: how much advance is used and what is left to pay. */
export function advanceAtCheckout(total: number, advance: number): { used: number; payable: number } {
  const used = round2(Math.max(0, Math.min(advance, total)));
  return { used, payable: round2(Math.max(0, total - used)) };
}

/** Statement entry type → passbook kind. */
export function entryKind(type: string): KhataEntryKind {
  const k = type.toLowerCase();
  if (k.includes("opening")) return "opening";
  if (k.includes("invoice")) return "bill";
  if (k.includes("receipt") || k.includes("payment")) return "payment";
  if (k.includes("credit")) return "credit";
  return "adjustment";
}

/** Filter chips on the passbook. */
export function filterEntries(rows: KhataEntry[], f: "all" | "bills" | "payments"): KhataEntry[] {
  if (f === "bills") return rows.filter((r) => r.kind === "bill");
  if (f === "payments") return rows.filter((r) => r.kind === "payment");
  return rows;
}

/** Totals for statement / passbook. customer_statement always starts with a
 *  synthetic "Opening balance" row dated p_from; the rest are movements. */
export function statementTotals(rows: KhataEntry[]): { opening: number; debit: number; credit: number; closing: number } {
  const first = rows[0];
  const synthetic = !!first && first.kind === "opening" && first.refNo === "";
  const opening = !first ? 0 : synthetic ? round2(first.debit - first.credit) : round2(first.balance - first.debit + first.credit);
  const body = synthetic ? rows.slice(1) : rows;
  const debit = round2(body.reduce((s, r) => s + r.debit, 0));
  const credit = round2(body.reduce((s, r) => s + r.credit, 0));
  return { opening, debit, credit, closing: round2(rows.at(-1)?.balance ?? opening) };
}

/** Passbook rows: movements only (synthetic opening dropped), newest first. */
export function passbookRows(rows: KhataEntry[]): KhataEntry[] {
  const first = rows[0];
  const body = first && first.kind === "opening" && first.refNo === "" ? rows.slice(1) : rows;
  return [...body].reverse();
}

/** UPI deep link for a payment amount. */
export function upiPayLink(upiId: string, payee: string, amount: number, note: string): string {
  const p = new URLSearchParams({ pa: upiId, pn: payee, am: amount.toFixed(2), cu: "INR", tn: note });
  return `upi://pay?${p.toString()}`;
}

/* ---------- Reads ---------- */

export async function fetchKhataSummary(): Promise<KhataSummary> {
  const { data, error } = await supabase.rpc("my_khata_summary");
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    due: n(r["due"]),
    advance: n(r["advance"]),
    balance: n(r["balance"]),
    creditLimit: n(r["credit_limit"]),
    available: n(r["available"]),
    overdue: n(r["overdue"]),
    oldestUnpaid: (r["oldest_unpaid"] as string) ?? null,
    pendingPayments: n(r["pending_payments"]),
  };
}

export async function fetchKhataEntries(from: string, to: string): Promise<KhataEntry[]> {
  const { data, error } = await supabase.rpc("my_khata_statement", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    date: String(r.entry_date),
    kind: entryKind(String(r.entry_type ?? "")),
    rawType: String(r.entry_type ?? ""),
    refNo: String(r.ref_no ?? ""),
    details: String(r.description ?? ""),
    debit: n(r.debit),
    credit: n(r.credit),
    balance: n(r.balance),
    invoiceId: (r.invoice_id as string | null) ?? null,
    orderId: (r.order_id as string | null) ?? null,
  }));
}

export async function fetchKhataProofs(): Promise<KhataProof[]> {
  const { data, error } = await supabase
    .from("payment_proofs")
    .select("id, amount, method, reference, paid_on, status, reject_reason, balance_after, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    amount: n(r.amount),
    method: String(r.method ?? ""),
    reference: (r.reference as string) ?? null,
    paidOn: String(r.paid_on ?? ""),
    status: (r.status as KhataProof["status"]) ?? "pending",
    rejectReason: (r.reject_reason as string) ?? null,
    balanceAfter: r.balance_after == null ? null : n(r.balance_after),
    reviewedAt: (r.reviewed_at as string) ?? null,
    createdAt: String(r.created_at ?? ""),
  }));
}

/** Customer's unallocated advance (all firms). */
export async function fetchMyAdvance(): Promise<number> {
  const cid = await getMyCustomerId();
  if (!cid) return 0;
  const { data, error } = await supabase.rpc("customer_advance", { p_customer_id: cid });
  if (error) return 0;
  return n(data);
}

/* ---------- Writes ---------- */

export type PaymentInput = {
  amount: number;
  method: "upi" | "bank" | "cash" | "cheque";
  reference?: string | null;
  paidOn: string;
  screenshotPath?: string | null;
  cashPaidTo?: "office" | "salesman" | "driver" | null;
  cashPaidToName?: string | null;
  chequeNo?: string | null;
  chequeBank?: string | null;
  chequeDate?: string | null;
};

export async function submitMyPayment(i: PaymentInput): Promise<string> {
  const args: Record<string, string | number> = { p_amount: i.amount, p_method: i.method, p_paid_on: i.paidOn };
  if (i.reference?.trim()) args["p_reference"] = i.reference.trim();
  if (i.screenshotPath) args["p_screenshot_path"] = i.screenshotPath;
  if (i.cashPaidTo) args["p_cash_paid_to"] = i.cashPaidTo;
  if (i.cashPaidToName?.trim()) args["p_cash_paid_to_name"] = i.cashPaidToName.trim();
  if (i.chequeNo?.trim()) args["p_cheque_no"] = i.chequeNo.trim();
  if (i.chequeBank?.trim()) args["p_cheque_bank"] = i.chequeBank.trim();
  if (i.chequeDate) args["p_cheque_date"] = i.chequeDate;
  const { data, error } = await supabase.rpc("submit_my_payment", args as never);
  if (error) throw new Error(error.message);
  return String(data);
}

/** Uploads a payment proof file under the customer's folder (customer-docs). */
export async function uploadPaymentFile(file: Blob, name: string, mime: string): Promise<string> {
  const cid = await getMyCustomerId();
  if (!cid) throw new Error("Not signed in");
  const path = `${cid}/queries/${Date.now()}-${name.replace(/[^\w.-]+/g, "-")}`;
  const { error } = await supabase.storage.from("customer-docs").upload(path, file, { contentType: mime });
  if (error) throw new Error(error.message);
  return path;
}
