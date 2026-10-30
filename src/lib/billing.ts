/** Customer bills, receipts, statement and invoices — read via RLS / existing RPCs only. */
import { supabase } from "@/integrations/supabase/client";
import { getMyCustomerId } from "@/lib/orders";

export type OpenBill = {
  refId: string;
  refNo: string;
  kind: string;
  billDate: string;
  dueDate: string | null;
  total: number;
  paid: number;
  balance: number;
  daysOverdue: number;
};

export type PaidBill = { id: string; invoiceNo: string; invoiceDate: string; grandTotal: number };

export type Receipt = { id: string; receiptNo: string; receiptDate: string; mode: string; amount: number; status: string };

export type StatementRow = {
  date: string;
  type: string;
  refNo: string;
  details: string;
  debit: number;
  credit: number;
  balance: number;
};

export type InvoiceLine = {
  id: string;
  description: string;
  hsn: string | null;
  qty: number;
  rate: number;
  gstRate: number;
  taxable: number;
  tax: number;
  total: number;
};

export type Invoice = {
  id: string;
  orderId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  customerName: string | null;
  businessName: string | null;
  customerGstin: string | null;
  billingAddress: string | null;
  placeOfSupply: string | null;
  isInterstate: boolean;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  deposit: number;
  roundOff: number;
  grandTotal: number;
  paid: number;
  balance: number;
  lines: InvoiceLine[];
};

const num = (v: unknown) => Number(v ?? 0) || 0;

export async function fetchOpenBills(): Promise<OpenBill[]> {
  const cid = await getMyCustomerId();
  if (!cid) return [];
  const { data, error } = await supabase.rpc("customer_open_bills", { p_customer_id: cid });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    refId: r.ref_id,
    refNo: r.ref_no,
    kind: r.kind,
    billDate: r.bill_date,
    dueDate: r.due_date,
    total: num(r.total),
    paid: num(r.paid),
    balance: num(r.balance),
    daysOverdue: num(r.days_overdue),
  }));
}

export async function fetchPaidBills(): Promise<PaidBill[]> {
  const cid = await getMyCustomerId();
  if (!cid) return [];
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_no, invoice_date, grand_total, payment_status, status")
    .eq("customer_id", cid)
    .eq("payment_status", "paid")
    .order("invoice_date", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r) => r.status !== "cancelled")
    .map((r) => ({ id: r.id, invoiceNo: r.invoice_no, invoiceDate: r.invoice_date, grandTotal: num(r.grand_total) }));
}

export async function fetchReceipts(): Promise<Receipt[]> {
  const cid = await getMyCustomerId();
  if (!cid) return [];
  const { data, error } = await supabase
    .from("receipts")
    .select("id, receipt_no, receipt_date, mode, amount, status")
    .eq("customer_id", cid)
    .order("receipt_date", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    receiptNo: r.receipt_no,
    receiptDate: r.receipt_date,
    mode: r.mode,
    amount: num(r.amount),
    status: r.status,
  }));
}

/** month = "YYYY-MM" */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

export async function fetchStatement(month: string): Promise<StatementRow[]> {
  const cid = await getMyCustomerId();
  if (!cid) return [];
  const { from, to } = monthRange(month);
  const { data, error } = await supabase.rpc("customer_statement", { p_customer_id: cid, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    date: r.entry_date,
    type: r.entry_type,
    refNo: r.ref_no,
    details: r.description,
    debit: num(r.debit),
    credit: num(r.credit),
    balance: num(r.balance),
  }));
}

const INVOICE_SELECT =
  "id, order_id, invoice_no, invoice_date, due_date, customer_name, business_name, customer_gstin, billing_address, place_of_supply, is_interstate, taxable_value, cgst, sgst, igst, deposit_total, round_off, grand_total, amount_paid, invoice_lines(id, description, hsn_code, qty, unit_price, gst_rate, taxable_value, cgst, sgst, igst, line_total, sort_order)";

export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase.from("invoices").select(INVOICE_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const lines = [...(data.invoice_lines ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => ({
      id: l.id,
      description: l.description,
      hsn: l.hsn_code,
      qty: num(l.qty),
      rate: num(l.unit_price),
      gstRate: num(l.gst_rate),
      taxable: num(l.taxable_value),
      tax: num(l.cgst) + num(l.sgst) + num(l.igst),
      total: num(l.line_total),
    }));
  const grand = num(data.grand_total);
  const paid = num(data.amount_paid);
  return {
    id: data.id,
    orderId: data.order_id,
    invoiceNo: data.invoice_no,
    invoiceDate: data.invoice_date,
    dueDate: data.due_date,
    customerName: data.customer_name,
    businessName: data.business_name,
    customerGstin: data.customer_gstin,
    billingAddress: data.billing_address,
    placeOfSupply: data.place_of_supply,
    isInterstate: data.is_interstate,
    taxable: num(data.taxable_value),
    cgst: num(data.cgst),
    sgst: num(data.sgst),
    igst: num(data.igst),
    deposit: num(data.deposit_total),
    roundOff: num(data.round_off),
    grandTotal: grand,
    paid,
    balance: Math.max(0, grand - paid),
    lines,
  };
}

/** Invoice id for an order, if one has been raised. */
export async function fetchInvoiceIdForOrder(orderId: string): Promise<string | null> {
  const { data } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("order_id", orderId)
    .neq("status", "cancelled")
    .order("invoice_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** upi://pay link for the balance. */
export function upiLink(upiId: string, payee: string, amount: number, note: string): string {
  const p = new URLSearchParams({ pa: upiId, pn: payee, am: amount.toFixed(2), cu: "INR", tn: note });
  return `upi://pay?${p.toString()}`;
}
