import { ownCustomerFilter } from "@/lib/my-customer";
/** Account balance, ledger ranges, payment reports and statement PDF — existing RPCs/RLS only. */
import { supabase } from "@/integrations/supabase/client";
import { fetchOpenBills, type StatementRow } from "@/lib/billing";
import { getMyCustomerId, type CreditStatus } from "@/lib/orders";

export type Balance = {
  outstanding: number;
  overdue: number;
  limit: number;
  available: number;
  nextDue: string | null;
  overdueDays: number;
};

const n = (v: unknown) => Number(v ?? 0) || 0;
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Firms the customer deals with (firm credit rows + invoiced firms). */
async function myFirms(cid: string): Promise<string[]> {
  const ids = new Set<string>();
  const [a, b] = await Promise.all([
    supabase.from("customer_firm_credit").select("firm_id").eq("customer_id", cid),
    supabase.from("invoices").select("firm_id").eq("customer_id", cid).limit(500),
  ]);
  for (const r of a.data ?? []) if (r.firm_id) ids.add(r.firm_id);
  for (const r of b.data ?? []) if (r.firm_id) ids.add(r.firm_id);
  return [...ids];
}

/** Same firm-wise logic as checkout: sum credit_status per firm; fall back to the firm-less figure. */
export async function fetchBalance(): Promise<Balance | null> {
  const cid = await getMyCustomerId();
  if (!cid) return null;
  const firms = await myFirms(cid).catch(() => [] as string[]);
  const rows: CreditStatus[] = [];
  const calls = firms.length ? firms.map((f) => ({ p_customer_id: cid, p_firm_id: f })) : [{ p_customer_id: cid }];
  for (const args of calls) {
    const { data, error } = await supabase.rpc("credit_status", args);
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as CreditStatus | undefined;
    if (row) rows.push(row);
  }
  const bills = await fetchOpenBills().catch(() => []);
  const due = bills
    .filter((b) => b.balance > 0 && b.dueDate)
    .map((b) => b.dueDate!)
    .sort()[0];
  return summarise(rows, due ?? null);
}

export function summarise(rows: CreditStatus[], nextDue: string | null): Balance {
  return {
    outstanding: rows.reduce((s, r) => s + n(r.out_outstanding), 0),
    overdue: rows.reduce((s, r) => s + n(r.out_overdue), 0),
    limit: rows.reduce((s, r) => s + n(r.out_limit), 0),
    available: rows.reduce((s, r) => s + Math.max(0, n(r.out_available)), 0),
    overdueDays: rows.reduce((m, r) => Math.max(m, n(r.out_oldest_overdue_days)), 0),
    nextDue,
  };
}

export type RangeKey = "thisMonth" | "lastMonth" | "thisYear" | "custom";
export function rangeFor(key: Exclude<RangeKey, "custom">, now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (key === "thisMonth") return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
  if (key === "lastMonth") return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
  // Indian financial year: April–March
  const fyStart = m >= 3 ? y : y - 1;
  return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` };
}

export async function fetchLedger(from: string, to: string): Promise<StatementRow[]> {
  const cid = await getMyCustomerId();
  if (!cid) return [];
  const { data, error } = await supabase.rpc("customer_statement", { p_customer_id: cid, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    date: r.entry_date,
    type: r.entry_type,
    refNo: r.ref_no,
    details: r.description,
    debit: n(r.debit),
    credit: n(r.credit),
    balance: n(r.balance),
  }));
}

/** Opening = first row's balance minus its movement. */
export function openingOf(rows: StatementRow[]): number {
  const f = rows[0];
  if (!f) return 0;
  if (/opening/i.test(f.type)) return f.balance;
  return Math.round((f.balance - f.debit + f.credit) * 100) / 100;
}

export async function invoiceIdByNo(no: string): Promise<string | null> {
  const { data } = await supabase.from("invoices").select("id").eq("invoice_no", no).eq("customer_id", await ownCustomerFilter()).maybeSingle();
  return data?.id ?? null;
}

/* ---------- "I have paid" ---------- */

export const PAY_MODES = ["upi", "bank", "cheque", "cash"] as const;
export type PayMode = (typeof PAY_MODES)[number];

/* ---------- Statement PDF ---------- */

export async function statementPdf(opts: {
  company: string;
  address: string;
  customer: string;
  from: string;
  to: string;
  rows: StatementRow[];
  labels: { title: string; period: string; opening: string; closing: string; date: string; ref: string; details: string; debit: string; credit: string; balance: string };
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const money = (v: number) => (v ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  let y = 48;
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(11, 37, 69).text(opts.company, 40, y);
  y += 16;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90).text(opts.address, 40, y);
  y += 26;
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(30).text(opts.labels.title, 40, y);
  doc.setFont("helvetica", "normal").setFontSize(9).text(`${opts.labels.period}: ${opts.from} – ${opts.to}`, W - 40, y, { align: "right" });
  y += 14;
  doc.text(opts.customer, 40, y);
  y += 20;
  const cols = [40, 105, 200, 380, 445, W - 40];
  const header = () => {
    doc.setFillColor(11, 37, 69).rect(36, y - 11, W - 72, 16, "F");
    doc.setTextColor(255).setFont("helvetica", "bold");
    doc.text(opts.labels.date, cols[0]!, y);
    doc.text(opts.labels.ref, cols[1]!, y);
    doc.text(opts.labels.details, cols[2]!, y);
    doc.text(opts.labels.debit, cols[3]! + 50, y, { align: "right" });
    doc.text(opts.labels.credit, cols[4]! + 50, y, { align: "right" });
    doc.text(opts.labels.balance, cols[5]!, y, { align: "right" });
    doc.setTextColor(30).setFont("helvetica", "normal");
    y += 18;
  };
  header();
  doc.setFont("helvetica", "bold").text(opts.labels.opening, cols[2]!, y);
  doc.text(money(openingOf(opts.rows)) || "0.00", cols[5]!, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 16;
  for (const r of opts.rows) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 48;
      header();
    }
    doc.text(r.date, cols[0]!, y);
    doc.text(String(r.refNo ?? "").slice(0, 18), cols[1]!, y);
    doc.text(String(r.details || r.type).slice(0, 34), cols[2]!, y);
    doc.text(money(r.debit), cols[3]! + 50, y, { align: "right" });
    doc.text(money(r.credit), cols[4]! + 50, y, { align: "right" });
    doc.text(money(r.balance), cols[5]!, y, { align: "right" });
    y += 15;
  }
  y += 6;
  doc.setDrawColor(200).line(36, y - 10, W - 36, y - 10);
  doc.setFont("helvetica", "bold").text(opts.labels.closing, cols[2]!, y);
  doc.text(money(opts.rows.at(-1)?.balance ?? openingOf(opts.rows)) || "0.00", cols[5]!, y, { align: "right" });
  return doc.output("blob");
}

/** Share a file (WhatsApp etc. via the system sheet) or download it. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename, text });
      return "shared";
    } catch {
      /* cancelled → fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
