import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { fetchOrderDispatch, shortIrn, type OrderDispatch } from "@/lib/dispatch";
import { IST_TZ } from "@/lib/ist";

const fmt = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST_TZ }) : "";

export function useOrderDispatch(orderId: string | null | undefined) {
  const [d, setD] = useState<OrderDispatch | null>(null);
  useEffect(() => {
    if (!orderId) return;
    let on = true;
    void fetchOrderDispatch(orderId).then((r) => on && setD(r), () => undefined);
    return () => { on = false; };
  }, [orderId]);
  return d;
}

/** E-invoice IRN/QR, e-way bill and challan — shown only when present. */
export function GstBillDetails({ d }: { d: OrderDispatch | null }) {
  const { t } = useTranslation();
  if (!d || (!d.einvoice && !d.ewayBill && !d.challanNo)) return null;
  const e = d.einvoice;
  const copy = async (v: string) => {
    try { await navigator.clipboard.writeText(v); toast.success(t("invoice.copied")); } catch { /* ignore */ }
  };
  return (
    <section className="space-y-1 border-t border-border p-4 text-xs" data-testid="gst-details">
      {d.challanNo && <p data-testid="challan"><span className="text-muted-foreground">{t("gstBill.challan")} </span><b>{d.challanNo}</b></p>}
      {e && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {e.sandbox && <span data-testid="test-bill" className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("gstBill.testBill")}</span>}
            <p className="flex items-center gap-1" data-testid="irn">
              <span className="text-muted-foreground">IRN </span><b className="break-all print:hidden">{shortIrn(e.irn)}</b><b className="hidden break-all print:inline">{e.irn}</b>
              <button type="button" onClick={() => void copy(e.irn)} aria-label={t("gstBill.copyIrn")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary print:hidden"><Copy className="h-3.5 w-3.5" /></button>
            </p>
            {e.ackNo && <p><span className="text-muted-foreground">{t("gstBill.ack")} </span><b>{e.ackNo}</b>{e.ackDate ? ` · ${fmt(e.ackDate)}` : ""}</p>}
          </div>
          {e.signedQr && <QRCodeSVG value={e.signedQr} size={112} level="L" aria-label="E-invoice QR" data-testid="einv-qr" />}
        </div>
      )}
      {d.ewayBill && <p data-testid="ewb">{t("gstBill.ewb", { no: d.ewayBill.no, date: fmt(d.ewayBill.validTill) || "—" })}</p>}
    </section>
  );
}
