import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Landmark, Smartphone } from "lucide-react";
import { formatINR } from "@/lib/catalogue";
import type { FirmPayInfo } from "@/lib/payments.functions";
import { CopyRow } from "@/components/PaymentProofSheet";

/** UPI or bank-transfer "pay now" card, shared by the order-placed screen and order detail. */
export function PayCard({
  method,
  info,
  amount,
  orderNo,
  hold,
  title,
  onPaid,
}: {
  method: "upi" | "bank";
  info: FirmPayInfo | null;
  amount: number;
  orderNo: string;
  hold?: boolean | undefined;
  title?: string | undefined;
  onPaid: () => void;
}) {
  const { t } = useTranslation();
  const payee = info?.payeeName || info?.firmName || "";
  const upiId = info?.upiId ?? "";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(orderNo)}`;
  const hasDetails = method === "upi" ? !!upiId || !!info?.qrUrl : !!info?.bank;

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(t("success.copied"));
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm" data-testid={`pay-card-${method}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {method === "upi" ? <Smartphone className="h-4 w-4 text-secondary" aria-hidden /> : <Landmark className="h-4 w-4 text-secondary" aria-hidden />}
        {title ?? (method === "upi" ? t("success.payUpiTitle") : t("success.bankTitle"))}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-primary">{formatINR(amount)}</p>
      <p className="text-xs text-muted-foreground">{t("success.orderNoLabel", { no: orderNo })}</p>

      {!hasDetails ? (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">{t("success.infoMissing")}</p>
      ) : method === "upi" ? (
        <>
          {payee && <p className="mt-3 text-sm font-semibold text-foreground">{t("pay.payTo", { name: payee })}</p>}
          {upiId && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-1">
              <span className="min-w-0 truncate font-mono text-sm font-semibold text-foreground">{upiId}</span>
              <button
                type="button"
                onClick={() => void copy(upiId)}
                className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-semibold text-secondary"
              >
                <Copy className="h-4 w-4" aria-hidden /> {t("success.copy")}
              </button>
            </div>
          )}
          {upiId && (
            <a
              href={upiLink}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              <Smartphone className="h-4 w-4" aria-hidden /> {t("success.payWithApp")}
            </a>
          )}
          <div className="mt-4 flex flex-col items-center">
            <div className="rounded-xl border border-border bg-qr p-3">
              {info?.qrUrl ? (
                <img src={info.qrUrl} alt={t("pay.qrAlt")} width={200} height={200} className="h-[200px] w-[200px]" />
              ) : (
                <QRCodeSVG value={upiLink} size={200} level="M" aria-label={t("pay.qrAlt")} />
              )}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("pay.qrHint")}</p>
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
        className={`mt-3 flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
          method === "bank" && hasDetails
            ? "bg-primary text-primary-foreground"
            : "border border-secondary/40 bg-secondary/10 text-primary"
        }`}
      >
        {t("pay.ivePaidUtr")}
      </button>
      {hold && <p className="mt-2 text-center text-xs text-muted-foreground">{t("pay.holdNote")}</p>}
    </div>
  );
}

/** Small payment-status chip: amber while pending, grey for pay-on-delivery / credit. */
export function PayChip({ k, tone }: { k: string; tone: "ok" | "amber" | "grey" }) {
  const { t } = useTranslation();
  const cls = tone === "ok" ? "bg-secondary/15 text-primary" : tone === "amber" ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{t(`pay.chip.${k}`)}</span>;
}
