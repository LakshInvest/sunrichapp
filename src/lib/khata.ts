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

/* ---------- Date ranges (IST) ---------- */
import { istShiftDay, istToday } from "@/lib/ist";

/** This month / last month / last 3 months (incl. this one), ending today at most — in IST. */
export function khataRange(key: Exclude<KhataRange, "custom">, now = new Date()): { from: string; to: string } {
  const today = istToday(now);
  const thisStart = `${today.slice(0, 7)}-01`;
  const prevStart = istShiftDay(thisStart, -1).slice(0, 7) + "-01";
  if (key === "thisMonth") return { from: thisStart, to: today };
  if (key === "lastMonth") return { from: prevStart, to: istShiftDay(thisStart, -1) };
  return { from: istShiftDay(prevStart, -1).slice(0, 7) + "-01", to: today };
}

/* ---------- Statement PDF ---------- */

export type UnpaidBill = { refNo: string; billDate: string; dueDate: string | null; balance: number };

export async function khataStatementPdf(opts: {
  company: string;
  address: string;
  customer: string;
  from: string;
  to: string;
  rows: KhataEntry[];
  unpaid: UnpaidBill[];
  labels: Record<
    "pdfTitle" | "period" | "opening" | "closing" | "date" | "ref" | "details" | "debit" | "credit" | "balance" | "unpaid" | "billNo" | "dueOn" | "amountDue" | "customer",
    string
  >;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const L = opts.labels;
  const money = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tot = statementTotals(opts.rows);
  let y = 48;
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(11, 37, 69).text(opts.company, 40, y);
  y += 15;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90).text(opts.address.slice(0, 110), 40, y);
  y += 26;
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(30).text(L.pdfTitle, 40, y);
  doc.setFont("helvetica", "normal").setFontSize(9).text(`${L.period}: ${opts.from} to ${opts.to}`, W - 40, y, { align: "right" });
  y += 14;
  doc.text(`${L.customer}: ${opts.customer}`, 40, y);
  y += 22;

  const cols = [40, 100, 190, 395, 465, W - 40];
  const header = () => {
    doc.setFillColor(11, 37, 69).rect(36, y - 11, W - 72, 16, "F");
    doc.setTextColor(255).setFont("helvetica", "bold");
    doc.text(L.date, cols[0]!, y);
    doc.text(L.ref, cols[1]!, y);
    doc.text(L.details, cols[2]!, y);
    doc.text(L.debit, cols[3]! + 50, y, { align: "right" });
    doc.text(L.credit, cols[4]! + 50, y, { align: "right" });
    doc.text(L.balance, cols[5]!, y, { align: "right" });
    doc.setTextColor(30).setFont("helvetica", "normal");
    y += 18;
  };
  const page = () => {
    if (y > H - 70) {
      doc.addPage();
      y = 48;
      header();
    }
  };
  header();
  doc.setFont("helvetica", "bold").text(L.opening, cols[2]!, y);
  doc.text(money(tot.opening), cols[5]!, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 16;
  const body = opts.rows.length && opts.rows[0]!.kind === "opening" && opts.rows[0]!.refNo === "" ? opts.rows.slice(1) : opts.rows;
  for (const r of body) {
    page();
    doc.text(r.date, cols[0]!, y);
    doc.text(r.refNo.slice(0, 16), cols[1]!, y);
    doc.text((r.details || r.rawType).slice(0, 38), cols[2]!, y);
    doc.text(r.debit ? money(r.debit) : "", cols[3]! + 50, y, { align: "right" });
    doc.text(r.credit ? money(r.credit) : "", cols[4]! + 50, y, { align: "right" });
    doc.text(money(r.balance), cols[5]!, y, { align: "right" });
    y += 15;
  }
  page();
  doc.setDrawColor(200).line(36, y - 9, W - 36, y - 9);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(money(tot.debit), cols[3]! + 50, y, { align: "right" });
  doc.text(money(tot.credit), cols[4]! + 50, y, { align: "right" });
  y += 16;
  doc.text(L.closing, cols[2]!, y);
  doc.text(money(tot.closing), cols[5]!, y, { align: "right" });
  doc.setFont("helvetica", "normal");

  if (opts.unpaid.length) {
    y += 32;
    if (y > H - 100) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold").setFontSize(11).text(L.unpaid, 40, y);
    y += 18;
    doc.setFontSize(9);
    doc.text(L.billNo, 40, y);
    doc.text(L.date, 190, y);
    doc.text(L.dueOn, 290, y);
    doc.text(L.amountDue, W - 40, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 14;
    for (const b of opts.unpaid) {
      if (y > H - 50) {
        doc.addPage();
        y = 48;
      }
      doc.text(b.refNo.slice(0, 24), 40, y);
      doc.text(b.billDate, 190, y);
      doc.text(b.dueDate ?? "", 290, y);
      doc.text(money(b.balance), W - 40, y, { align: "right" });
      y += 14;
    }
  }
  return doc.output("blob");
}
