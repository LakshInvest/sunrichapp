import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { installedUpiApps, openUpi, upiLink, UPI_APPS, type UpiApp } from "@/lib/upi";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Smartphone } from "lucide-react";
import { formatINR } from "@/lib/catalogue";
import type { FirmPayInfo } from "@/lib/payments.functions";
import { CopyRow } from "@/components/PaymentProofSheet";

/** UPI or bank-transfer "pay now" card, shared by order success, order detail and Khata. */
export function PayCard({
  method,
  info,
  amount,
  orderNo,
  orderId,
  hold: _hold,
  title,
  onPaid,
}: {
  method: "upi" | "bank";
  info: FirmPayInfo | null;
  amount: number;
  orderNo: string;
  orderId?: string | undefined;
  hold?: boolean | undefined;
  title?: string | undefined;
  onPaid: () => void;
}) {
  const { t } = useTranslation();
  const payee = info?.payeeName || info?.firmName || "";
  const upiId = info?.upiId ?? "";
  const params = { pa: upiId, pn: payee, amount, orderNo };
  const link = upiLink(params);
  const hasDetails = method === "upi" ? !!upiId || !!info?.qrUrl : !!info?.bank;
  const [apps, setApps] = useState<UpiApp[]>([]);
  useEffect(() => {
    if (method === "upi") void installedUpiApps().then(setApps);
  }, [method]);

  const launch = async (app?: UpiApp) => {
    const res = await openUpi(params, app, orderId);
    if (res.kind === "noApp") toast.error(t("upi.noApp"));
  };

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(t("success.copied"));
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-2xl bg-card p-4 text-left shadow-sm" data-testid={`pay-card-${method}`}>
      <p className="text-sm font-bold text-foreground">{title ?? (method === "upi" ? t("upi.payNow") : t("success.bankTitle"))}</p>

      {!hasDetails ? (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">{t("success.infoMissing")}</p>
      ) : method === "upi" ? (
        <>
          {upiId && (
            <button
              type="button"
              onClick={() => void launch()}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              <Smartphone className="h-4 w-4" aria-hidden /> {t("upi.payAmount", { amount: formatINR(amount) })}
            </button>
          )}
          {upiId && apps.length > 0 && (
            <div className="mt-2 flex gap-2">
              {UPI_APPS.filter((a) => apps.includes(a.id)).map((a) => (
                <button key={a.id} type="button" onClick={() => void launch(a.id)} className="min-h-11 flex-1 rounded-xl border border-border text-sm font-semibold text-foreground active:scale-95">
                  {a.label}
                </button>
              ))}
            </div>
          )}
          {upiId && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-1">
              <span className="min-w-0 truncate font-mono text-sm font-semibold text-foreground">{upiId}</span>
              <button type="button" onClick={() => void copy(upiId)} className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-semibold text-secondary">
                <Copy className="h-4 w-4" aria-hidden /> {t("success.copy")}
              </button>
            </div>
          )}
          <div className="mt-4 flex flex-col items-center">
            <div className="rounded-xl bg-qr p-3">
              {info?.qrUrl ? (
                <img src={info.qrUrl} alt={t("pay.qrAlt")} width={180} height={180} className="h-[180px] w-[180px]" />
              ) : (
                <QRCodeSVG value={link} size={180} level="M" aria-label={t("pay.qrAlt")} />
              )}
            </div>
            {payee && <p className="mt-2 text-center text-xs text-muted-foreground">{t("pay.payTo", { name: payee })}</p>}
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-xl bg-muted px-3">
          <CopyRow label={t("success.accountName")} value={info!.bank!.accountName} />
          <CopyRow label={t("success.bankName")} value={info!.bank!.bankName} />
          <CopyRow label={t("success.accountNo")} value={info!.bank!.accountNumber} />
          <CopyRow label={t("success.ifsc")} value={info!.bank!.ifsc} />
        </div>
      )}

      <button
        type="button"
        onClick={onPaid}
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-primary/30 text-sm font-semibold text-primary transition active:scale-[0.98]"
      >
        {t("upi.paidEnterUtr")}
      </button>
      {/* One line only — "Sunrich sends the order once the payment is checked". */}
      <p className="mt-2 text-center text-xs text-muted-foreground">{t("success.checkNote")}</p>
    </div>
  );
}

/** Small payment-status chip: amber while pending, grey for pay-on-delivery / credit. */
export function PayChip({ k, tone }: { k: string; tone: "ok" | "amber" | "grey" }) {
  const { t } = useTranslation();
  const cls = tone === "ok" ? "bg-secondary/15 text-primary" : tone === "amber" ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{t(`pay.chip.${k}`)}</span>;
}
