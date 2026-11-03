import { QRCodeSVG } from "qrcode.react";
import { formatINR } from "@/lib/catalogue";
import { upiLink, type Invoice } from "@/lib/billing";
import type { InvoiceFirm } from "@/lib/invoice.functions";
import { IST_TZ } from "@/lib/ist";
import { amountInWords } from "@/lib/amount-words";

/**
 * Customer copy of the Command Center A4 invoice. Every label, colour and
 * on/off switch comes from the firm's saved design (firms.invoice_design),
 * so there is one design owned by CC. Firm colours are tenant data, hence
 * inline styles.
 */
type L = { en?: string; hi?: string; mr?: string };
const loc = (v: unknown, lang: string, fb: string): string => {
  if (typeof v === "string") return v || fb;
  if (v && typeof v === "object") {
    const o = v as L;
    return (lang === "hi" ? o.hi : lang === "mr" ? o.mr : o.en) || o.en || fb;
  }
  return fb;
};
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST_TZ }) : "—";

export function BrandedInvoice({ inv, firm, lang }: { inv: Invoice; firm: InvoiceFirm | null; lang: string }) {
  const d = (firm?.design ?? {}) as Record<string, unknown>;
  const on = (k: string, def = true) => (d[k] === undefined ? def : Boolean(d[k]));
  const head = (d["headerColor"] as string) || "#0D3278";
  const accent = (d["accentColor"] as string) || "#0AAAED";
  const foot = (d["footerColor"] as string) || head;
  const cols = (d["cols"] ?? {}) as Record<string, unknown>;
  const col = (k: string, fb: string) => loc(cols[k], lang, fb);
  const seller = (d["sellerFields"] ?? {}) as Record<string, boolean>;
  const terms = Array.isArray(d["terms"]) ? (d["terms"] as unknown[]).map((x) => loc(x, lang, "")).filter(Boolean) : [];
  const gst = inv.cgst + inv.sgst + inv.igst;
  const small = d["fontSize"] === "small";

  // HSN summary
  const hsn = new Map<string, { taxable: number; tax: number; rate: number }>();
  for (const l of inv.lines) {
    const k = `${l.hsn ?? "—"}|${l.gstRate}`;
    const h = hsn.get(k) ?? { taxable: 0, tax: 0, rate: l.gstRate };
    h.taxable += l.taxable;
    h.tax += l.tax;
    hsn.set(k, h);
  }

  return (
    <article className={`invoice-a4 overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm print:rounded-none print:border-0 print:shadow-none ${small ? "text-[10px]" : "text-[11px]"}`}>
      <header className="flex items-start gap-3 p-4" style={{ background: head, color: "#fff" }}>
        {firm?.logoUrl && <img src={firm.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-card object-contain p-1" />}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">{firm?.legalName ?? "Sunrich"}</p>
          {d["tagline"] != null && <p className="opacity-80">{loc(d["tagline"], lang, "")}</p>}
        </div>
        <p className="shrink-0 text-right text-sm font-extrabold tracking-wide">{loc(d["title"], lang, "TAX INVOICE")}</p>
      </header>
      <div className="h-1" style={{ background: accent }} />

      <section className="grid grid-cols-2 gap-3 p-4">
        <div>
          <p className="font-bold uppercase" style={{ color: accent }}>{loc(d["sellerTitle"], lang, "Sold by")}</p>
          <p className="font-semibold">{firm?.legalName}</p>
          {seller["address"] !== false && firm?.address && <p className="text-muted-foreground">{firm.address}</p>}
          {seller["gstin"] !== false && firm?.gstin && <p>GSTIN {firm.gstin}</p>}
          {seller["fssai"] !== false && firm?.fssai && <p>FSSAI {firm.fssai}</p>}
          {seller["pan"] && firm?.pan && <p>PAN {firm.pan}</p>}
          {seller["phone"] !== false && firm?.phone && <p>{firm.phone}</p>}
          {seller["email"] && firm?.email && <p>{firm.email}</p>}
        </div>
        <div className="text-right">
          <p><span className="text-muted-foreground">Invoice no. </span><b className="break-all">{inv.invoiceNo}</b></p>
          <p><span className="text-muted-foreground">Date </span><b>{fmtDate(inv.invoiceDate)}</b></p>
          {on("showCreditDays") && inv.dueDate && <p><span className="text-muted-foreground">Due </span><b>{fmtDate(inv.dueDate)}</b></p>}
          {inv.placeOfSupply && <p><span className="text-muted-foreground">Place of supply </span>{inv.placeOfSupply}</p>}
        </div>
        <div className="col-span-2 rounded-lg bg-muted/50 p-2.5">
          <p className="font-bold uppercase" style={{ color: accent }}>{loc(d["billTitle"], lang, "Bill to")}</p>
          <p className="font-semibold">{inv.businessName ?? inv.customerName}</p>
          {inv.billingAddress && <p className="text-muted-foreground">{inv.billingAddress}</p>}
          {inv.customerGstin && <p>GSTIN {inv.customerGstin}</p>}
        </div>
      </section>

      <div className="overflow-x-auto px-4">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: head, color: "#fff" }}>
              <th className="p-1.5 text-left">{col("product", "Product")}</th>
              {on("showHsn") && <th className="p-1.5 text-left">{col("hsn", "HSN")}</th>}
              <th className="p-1.5 text-right">{col("qty", "Qty")}</th>
              <th className="p-1.5 text-right">{col("rate", "Rate")}</th>
              {on("showTaxable") && <th className="p-1.5 text-right">{col("taxable", "Taxable")}</th>}
              <th className="p-1.5 text-right">{col("gst", "GST")}</th>
              <th className="p-1.5 text-right">{col("amount", "Amount ₹")}</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-border align-top">
                <td className="p-1.5 font-semibold">{l.description}</td>
                {on("showHsn") && <td className="p-1.5">{l.hsn ?? "—"}</td>}
                <td className="p-1.5 text-right">{l.qty}</td>
                <td className="p-1.5 text-right">{formatINR(l.rate)}</td>
                {on("showTaxable") && <td className="p-1.5 text-right">{formatINR(l.taxable)}</td>}
                <td className="p-1.5 text-right">{l.gstRate}%<br />{formatINR(l.tax)}</td>
                <td className="p-1.5 text-right font-bold">{formatINR(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="grid grid-cols-2 gap-3 p-4">
        <div>
          {on("showHsnSummary") && hsn.size > 0 && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-1 text-left">HSN</th><th className="py-1 text-right">Taxable</th><th className="py-1 text-right">GST</th>
                </tr>
              </thead>
              <tbody>
                {[...hsn.entries()].map(([k, h]) => (
                  <tr key={k}><td className="py-0.5">{k.split("|")[0]} · {h.rate}%</td><td className="py-0.5 text-right">{formatINR(h.taxable)}</td><td className="py-0.5 text-right">{formatINR(h.tax)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <dl className="space-y-1">
          <Row k="Taxable value" v={formatINR(inv.taxable)} />
          {inv.isInterstate ? <Row k="IGST" v={formatINR(inv.igst)} /> : (<><Row k="CGST" v={formatINR(inv.cgst)} /><Row k="SGST" v={formatINR(inv.sgst)} /></>)}
          {gst === 0 && <Row k="GST" v={formatINR(0)} />}
          {inv.deposit > 0 && <Row k="Jar deposit" v={formatINR(inv.deposit)} />}
          {inv.roundOff !== 0 && <Row k="Round off" v={formatINR(inv.roundOff)} />}
          <div className="flex justify-between border-t pt-1 text-sm font-extrabold" style={{ borderColor: head, color: head }}>
            <dt>Total</dt><dd>{formatINR(inv.grandTotal)}</dd>
          </div>
          {inv.paid > 0 && <Row k="Paid" v={formatINR(inv.paid)} />}
          {inv.balance > 0 && <Row k="Balance due" v={formatINR(inv.balance)} bold />}
        </dl>
        <p className="col-span-2 italic text-muted-foreground">{amountInWords(inv.grandTotal)}</p>
        {d["note"] != null && <p className="col-span-2 text-muted-foreground">{loc(d["note"], lang, "")}</p>}
      </section>

      {(on("showQr") || on("showBank")) && (
        <section className="mx-4 mb-4 grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-border p-3">
          {on("showQr") && firm?.upiId && inv.balance > 0 ? (
            <div className="rounded-lg bg-card p-1.5">
              <QRCodeSVG value={upiLink(firm.upiId, firm.payeeName ?? firm.legalName, inv.balance, inv.invoiceNo)} size={104} aria-label="UPI QR" />
            </div>
          ) : <span />}
          <div className="space-y-0.5">
            <p className="font-bold" style={{ color: head }}>{loc(d["payHeading"], lang, "Scan & pay with any UPI app")}</p>
            {on("showUpi") && firm?.upiId && <p className="break-all">UPI: <b>{firm.upiId}</b></p>}
            {on("showBank") && firm?.bank && (
              <p className="text-muted-foreground">{firm.bank.name} · A/c {firm.bank.accountNo} · IFSC {firm.bank.ifsc}</p>
            )}
            {d["payLine"] != null && <p className="text-muted-foreground">{loc(d["payLine"], lang, "")}</p>}
          </div>
        </section>
      )}

      <section className="grid grid-cols-[1fr_auto] gap-3 px-4 pb-4">
        <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
          {terms.map((x, i) => <li key={i}>{x}</li>)}
        </ol>
        <div className="flex min-w-28 flex-col items-center justify-end text-center">
          {firm?.signatureUrl && <img src={firm.signatureUrl} alt="" className="h-10 object-contain" />}
          {on("showForFirm") && <p className="font-semibold">For {firm?.legalName}</p>}
          <p className="border-t border-border pt-0.5 text-muted-foreground">{loc(d["signatureLabel"], lang, "Authorised signatory")}</p>
        </div>
      </section>

      <footer className="flex justify-between gap-2 px-4 py-2" style={{ background: foot, color: "#fff" }}>
        <span>{loc(d["footerLeft"], lang, "")}</span>
        <span className="text-right">{loc(d["footerRight"], lang, "")}</span>
      </footer>
    </article>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
