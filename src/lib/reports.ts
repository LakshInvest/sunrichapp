import { supabase } from "@/integrations/supabase/client";
import { ownCustomerFilter } from "@/lib/my-customer";
import { fetchMyOrders } from "@/lib/orders";
import { fetchKhataEntries } from "@/lib/khata";
import { monthRange } from "@/lib/billing";

export async function fetchReportPurchases() {
  const cid = await ownCustomerFilter();
  const [orders, bills] = await Promise.all([fetchMyOrders(), supabase.from("invoices").select("order_id, amount_paid").eq("customer_id", cid).eq("status", "issued")]);
  if (bills.error) { console.error("Reports: invoices", bills.error); throw bills.error; }
  const paid: Record<string, number> = {};
  for (const b of bills.data ?? []) if (b.order_id) paid[b.order_id] = (paid[b.order_id] ?? 0) + Number(b.amount_paid);
  return { orders, paid };
}
export async function fetchReportPayments(month: string) {
  const cid = await ownCustomerFilter();
  const { from, to } = monthRange(month);
  const [rows, receipts] = await Promise.all([fetchKhataEntries(from, to), supabase.from("receipts").select("receipt_no, mode, amount").eq("customer_id", cid).eq("status", "posted").gte("receipt_date", from).lte("receipt_date", to)]);
  if (receipts.error) { console.error("Reports: receipts", receipts.error); throw receipts.error; }
  // Only receipts actually included by customer_statement (including bounced/QA exclusions).
  const refs = new Set(rows.filter((r) => r.kind === "payment").map((r) => r.refNo));
  const modes: Record<string, number> = { upi: 0, cash: 0, bank: 0, cheque: 0 };
  for (const r of receipts.data ?? []) if (refs.has(r.receipt_no)) modes[r.mode] = (modes[r.mode] ?? 0) + Number(r.amount);
  return { rows, modes };
}
export async function fetchMyNote(number: string) {
  const { data, error } = await supabase.from("credit_debit_notes").select("id, note_no, note_type, note_date, reason, total, taxable_value, tax_amount, invoice_id").eq("customer_id", await ownCustomerFilter()).eq("note_no", number).eq("status", "issued").maybeSingle();
  if (error) { console.error("Khata: credit_debit_notes", error); throw error; }
  return data;
}
/** Canvas text preserves Hindi/Marathi shaping without jsPDF's Latin-only default font. */
export async function reportPdf(title: string, period: string, lines: string[]): Promise<Blob> {
  await document.fonts.ready;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const canvas = document.createElement("canvas"); canvas.width = 1190; canvas.height = 1684;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF could not be created");
  const styles = getComputedStyle(document.documentElement);
  const card = styles.getPropertyValue("--card").trim();
  const text = styles.getPropertyValue("--foreground").trim();
  const primary = styles.getPropertyValue("--primary").trim();
  const font = styles.getPropertyValue("--font-sans").trim();
  let y = 180; let page = 0;
  const start = () => { ctx.fillStyle = card; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = primary; ctx.font = `bold 34px ${font}`; ctx.fillText(title, 70, 80); ctx.font = `24px ${font}`; ctx.fillText(period, 70, 126); ctx.fillStyle = text; ctx.font = `26px ${font}`; y = 180; };
  const finish = () => { if (page++) doc.addPage(); doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 595.28, 841.89); };
  start();
  for (const line of lines) {
    let fragment = "";
    for (const word of line.split(" ")) {
      const next = fragment ? `${fragment} ${word}` : word;
      if (ctx.measureText(next).width > 1050 && fragment) { if (y > 1570) { finish(); start(); } ctx.fillText(fragment, 70, y); y += 40; fragment = word; }
      else fragment = next;
    }
    if (y > 1570) { finish(); start(); } ctx.fillText(fragment, 70, y); y += 48;
  }
  finish(); return doc.output("blob");
}