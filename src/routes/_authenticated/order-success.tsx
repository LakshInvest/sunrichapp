import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { BellRing, Landmark, Smartphone } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { acceptPush, declinePush, shouldOfferPush } from "@/lib/push";
import { ArrowRight, Check } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PaymentProofSheet, PaymentStatusNote, CopyRow, type ProofTarget } from "@/components/PaymentProofSheet";
import { formatINR } from "@/lib/catalogue";
import { useLang } from "@/hooks/use-lang";
import { fetchMyPaymentProofs, type PayMethod, type PaymentProof } from "@/lib/payments";
import { getFirmPaymentInfo, type FirmPayInfo } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/order-success")({
  head: () => ({
    meta: [
      { title: en.success.metaTitle },
      { name: "description", content: en.success.metaDescription },
      { property: "og:title", content: en.success.metaTitle },
      { property: "og:description", content: en.success.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderSuccess,
});

type Part = {
  order_id: string;
  order_no: string;
  status: string;
  grand_total: number;
  fulfilled_by: string;
};

function statusWord(status: string, t: (k: string) => string): string {
  if (status === "approved") return t("success.statusConfirmed");
  if (status === "credit_hold") return t("success.statusUnderReview");
  return t("status.placed");
}

function OrderSuccess() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const deva = lang === "en" ? "" : "font-deva";

  const [parts, setParts] = useState<Part[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [info, setInfo] = useState<Record<string, FirmPayInfo>>({});
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [proofFor, setProofFor] = useState<ProofTarget | null>(null);

  const [pushOpen, setPushOpen] = useState(false);
  useEffect(() => {
    if (shouldOfferPush()) setTimeout(() => setPushOpen(true), 1200);
  }, []);

  const loadProofs = () => {
    fetchMyPaymentProofs()
      .then((list) => {
        const ids = new Set(parts.map((p) => p.order_id));
        setProofs(list.filter((p) => p.orderId && ids.has(p.orderId)));
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sunrich.lastOrder");
      if (raw) {
        const parsed = JSON.parse(raw) as { parts: Part[]; deliveryDate: string; slot: string; payMethod?: PayMethod };
        setParts(parsed.parts ?? []);
        setDeliveryDate(parsed.deliveryDate ?? "");
        setSlot(parsed.slot ?? "");
        if (parsed.payMethod) setPayMethod(parsed.payMethod);
      }
    } catch {
      /* show the calm empty state */
    }
  }, []);

  // Firm UPI / bank details for the orders just placed (each firm has its own).
  useEffect(() => {
    if (parts.length === 0) return;
    if (payMethod !== "upi" && payMethod !== "bank") return;
    getFirmPaymentInfo({ data: { orderIds: parts.map((p) => p.order_id) } })
      .then(setInfo, () => setInfo({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts.length, payMethod]);

  useEffect(loadProofs, [parts.length]);

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-5 pb-10 ${deva}`}>
      <OfflineBanner />
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        {/* Soft check animation */}
        <svg viewBox="0 0 96 96" className="h-24 w-24" role="img" aria-label={t("success.title")}>
          <circle
            className="animate-check-ring"
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#2EA3C7"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="264"
            strokeDashoffset="264"
          />
          <path
            className="animate-check-mark"
            d="M32 50 L44 62 L66 38"
            fill="none"
            stroke="#0B2545"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset="60"
          />
        </svg>

        <h1 className="mt-6 text-2xl font-bold text-primary">{t("success.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("success.subtitle")}</p>

        {deliveryDate && (
          <p className="mt-4 rounded-xl bg-secondary/10 px-4 py-2 text-sm font-semibold text-primary">
            {t("success.expected", { date: deliveryDate, slot })}
          </p>
        )}

        <ul className="mt-6 w-full space-y-3">
          {parts.map((p) => (
            <li key={p.order_id} className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-foreground">{p.order_no}</p>
                <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {statusWord(p.status, t)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {t("success.deliveredBy", {
                    who: p.fulfilled_by === "distributor" ? t("success.byDistributor") : t("success.bySunrich"),
                  })}
                </span>
                <span className="font-bold text-primary">{formatINR(p.grand_total)}</span>
              </div>
              <PayBlock
                part={p}
                method={payMethod}
                info={info[p.order_id] ?? null}
                proof={proofs.find((x) => x.orderId === p.order_id) ?? null}
                onPay={() =>
                  setProofFor({ orderId: p.order_id, orderNo: p.order_no, amount: p.grand_total, method: payMethod === "bank" ? "bank" : "upi" })
                }
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/track/$id", params: { id: parts[0]?.order_id ?? "" } })}
          disabled={parts.length === 0}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:opacity-50"
        >
          {t("success.trackOrder")}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-lg font-semibold text-foreground transition active:scale-[0.98]"
        >
          <Check className="h-5 w-5 text-secondary" aria-hidden />
          {t("success.continueShopping")}
        </button>
      </div>
      <PaymentProofSheet
        open={proofFor != null}
        onOpenChange={(o) => {
          if (!o) setProofFor(null);
        }}
        target={proofFor}
        onDone={loadProofs}
      />
      <SheetDrawer open={pushOpen} onOpenChange={(o) => { if (!o) declinePush(); setPushOpen(o); }}>
        <div className="px-5 pb-8 pt-2 text-center">
          <BellRing className="mx-auto h-10 w-10 text-secondary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("push.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("push.body")}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className="min-h-12 rounded-xl border border-border font-semibold" onClick={() => { declinePush(); setPushOpen(false); }}>
              {t("push.no")}
            </button>
            <button type="button" className="min-h-12 rounded-xl bg-primary font-semibold text-primary-foreground" onClick={() => { setPushOpen(false); void acceptPush(); }}>
              {t("push.yes")}
            </button>
          </div>
        </div>
      </SheetDrawer>
    </main>
  );
}

/** The payment step under one placed order, per the method chosen at checkout. */
function PayBlock({
  part,
  method,
  info,
  proof,
  onPay,
}: {
  part: Part;
  method: PayMethod;
  info: FirmPayInfo | null;
  proof: PaymentProof | null;
  onPay: () => void;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  if (proof?.status === "verified" || proof?.status === "pending") {
    return <PaymentStatusNote proof={proof} />;
  }
  if (method === "credit") {
    return <p className="mt-3 text-sm text-muted-foreground">{t("success.payCredit")}</p>;
  }
  if (method === "cash" || method === "cheque") {
    return <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-sm font-medium text-foreground">{t(`success.pay${method === "cash" ? "Cash" : "Cheque"}`)}</p>;
  }
  if (proof?.status === "rejected") {
    return <PaymentStatusNote proof={proof} onSendAgain={onPay} />;
  }
  const amount = info?.grandTotal ?? part.grand_total;
  const payee = info?.payeeName ?? "";
  const upiId = info?.upiId ?? "";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(part.order_no)}`;
  if (method === "upi") {
    if (!info || (!info.qrUrl && !upiId)) {
      return (
        <>
          <PaymentStatusNote proof={proof} />
          <p className="mt-3 text-sm text-muted-foreground">{t("success.infoMissing")}</p>
        </>
      );
    }
    return (
      <div className="mt-3 rounded-xl border border-border bg-background p-3">
        <div className="flex flex-col items-center text-center">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Smartphone className="h-4 w-4 text-secondary" aria-hidden /> {t("success.payUpiTitle")}
          </p>
          <div className="mt-2 rounded-lg bg-white p-2">
            {info.qrUrl ? (
              <img src={info.qrUrl} alt={t("success.payUpiTitle")} width={168} height={168} className="h-42 w-42 rounded" />
            ) : (
              <QRCodeSVG value={upiLink} size={160} level="M" aria-label={t("success.payUpiTitle")} />
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {info.firmName}
            {upiId ? ` · ${upiId}` : ""}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{formatINR(amount)}</p>
          <p className="text-xs text-muted-foreground">{t("success.orderNoLabel", { no: part.order_no })}</p>
          <a
            href={upiLink}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" aria-hidden /> {t("success.payWithApp")}
          </a>
          <button
            type="button"
            onClick={onPay}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition active:scale-[0.98]"
          >
            {t("success.ivePaid")}
          </button>
        </div>
      </div>
    );
  }
  // bank transfer
  if (!info?.bank) {
    return (
      <>
        <PaymentStatusNote proof={proof} />
        <p className="mt-3 text-sm text-muted-foreground">{t("success.infoMissing")}</p>
      </>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Landmark className="h-4 w-4 text-secondary" aria-hidden /> {t("success.bankTitle")}
      </p>
      <div className="mt-1">
        <CopyRow label={t("success.bankName")} value={info.bank.bankName} />
        <CopyRow label={t("success.accountNo")} value={info.bank.accountNumber} />
        <CopyRow label={t("success.ifsc")} value={info.bank.ifsc} />
        <CopyRow label={t("success.accountName")} value={info.bank.accountName} />
      </div>
      <p className="mt-2 text-sm font-bold text-primary">{formatINR(amount)}</p>
      <p className="text-xs text-muted-foreground">{t("success.orderNoLabel", { no: part.order_no })}</p>
      <button
        type="button"
        onClick={onPay}
        className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
      >
        {t("success.ivePaid")}
      </button>
    </div>
  );
}
