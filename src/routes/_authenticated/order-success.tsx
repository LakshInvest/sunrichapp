import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BellRing, Truck } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { acceptPush, declinePush, shouldOfferPush } from "@/lib/push";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PaymentProofSheet, PaymentStatusNote, type ProofTarget } from "@/components/PaymentProofSheet";
import { PayCard, PayChip } from "@/components/PayCard";
import { dayAndDate } from "@/lib/order-format";
import { fetchMyOrders, type OrderDto } from "@/lib/orders";
import { formatINR } from "@/lib/catalogue";
import { useLang } from "@/hooks/use-lang";
import { fetchMyPaymentProofs, fetchPaymentHold, paymentChip, releaseLine, successStatusKey, type PayMethod, type PaymentProof } from "@/lib/payments";
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

function OrderSuccess() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const deva = lang === "en" ? "" : "font-deva";

  const [parts, setParts] = useState<Part[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [pickup, setPickup] = useState(false);
  const [info, setInfo] = useState<Record<string, FirmPayInfo>>({});
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [live, setLive] = useState<Record<string, OrderDto>>({});
  const [holds, setHolds] = useState<Record<string, boolean>>({});
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
        const parsed = JSON.parse(raw) as { parts: Part[]; deliveryDate: string; slot: string; payMethod?: PayMethod; pickup?: boolean };
        setParts(parsed.parts ?? []);
        setDeliveryDate(parsed.deliveryDate ?? "");
        setSlot(parsed.slot ?? "");
        setPickup(!!parsed.pickup);
        if (parsed.payMethod) setPayMethod(parsed.payMethod);
      }
    } catch {
      /* show the calm empty state */
    }
  }, []);

  // Live order rows (status, dispatch batch, delivery mode) and payment hold flags.
  useEffect(() => {
    if (parts.length === 0) return;
    const ids = new Set(parts.map((p) => p.order_id));
    fetchMyOrders()
      .then((list) => setLive(Object.fromEntries(list.filter((o) => ids.has(o.id)).map((o) => [o.id, o]))))
      .catch(() => undefined);
    if (payMethod === "upi" || payMethod === "bank") {
      void Promise.all(parts.map(async (p) => [p.order_id, await fetchPaymentHold(p.order_id)] as const)).then((r) =>
        setHolds(Object.fromEntries(r)),
      );
    }
  }, [parts.length, payMethod]);

  // Firm UPI / bank details for the orders just placed (each firm has its own).
  useEffect(() => {
    if (parts.length === 0) return;
    if (payMethod !== "upi" && payMethod !== "bank") return;
    getFirmPaymentInfo({ data: { orderIds: parts.map((p) => p.order_id) } })
      .then(setInfo, () => setInfo({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts.length, payMethod]);

  useEffect(loadProofs, [parts.length]);

  const first = parts[0] ? live[parts[0].order_id] : undefined;
  const isPickup = first ? first.deliveryMode === "pickup" : pickup;
  const rl = first ? releaseLine(first) : null;
  const deliveryLine = rl && rl.key !== "dispatchingNow"
    ? t(`dispatch.${rl.key}`, { time: rl.time, date: rl.date ? dayAndDate(rl.date, lang) : undefined })
    : deliveryDate
      ? `${dayAndDate(deliveryDate, lang)}${slot && !isPickup ? ` · ${slot}` : ""}`
      : "";

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-5 pb-10 ${deva}`}>
      <OfflineBanner />
      <div className="flex flex-col items-center pt-10 text-center">
        <svg viewBox="0 0 96 96" className="h-20 w-20 shrink-0 overflow-visible" role="img" aria-label={t("success.title")}>
          <circle className="animate-check-ring" cx="48" cy="48" r="42" fill="none" stroke="var(--secondary)" strokeWidth="5" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="264" />
          <path className="animate-check-mark" d="M32 50 L44 62 L66 38" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" />
        </svg>
        <h1 className="mt-4 text-2xl font-bold text-primary">{t("success.title")}</h1>
        {parts.length > 0 && (
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{parts.map((p) => p.order_no).join(" · ")}</p>
        )}
      </div>

      <ul className="mt-6 w-full space-y-4">
        {parts.map((p) => {
          const proof = proofs.find((x) => x.orderId === p.order_id) ?? null;
          const status = live[p.order_id]?.status ?? p.status;
          const chip = paymentChip(payMethod, proof?.status ?? null);
          const showCard = (payMethod === "upi" || payMethod === "bank") && (!proof || proof.status === "rejected");
          return (
            <li key={p.order_id} className="space-y-3">
              <div className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-bold text-primary" data-testid="order-chip">
                    {t(successStatusKey(status, payMethod, proof?.status ?? null))}
                  </span>
                  <PayChip k={chip.key} tone={chip.tone} />
                  <span className="ml-auto text-base font-bold text-primary">{formatINR(p.grand_total)}</span>
                </div>
                {deliveryLine && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground" data-testid="delivery-line">
                    <Truck className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                    {deliveryLine}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {isPickup
                    ? t("pay.pickupFromPlant")
                    : p.fulfilled_by === "distributor"
                      ? t("pay.deliveryByDistributor")
                      : t("pay.deliveryBySunrich")}
                </p>
                {proof && <PaymentStatusNote proof={proof} />}
                {payMethod === "cash" && <p className="mt-3 text-sm text-muted-foreground">{t("success.payCash")}</p>}
                {payMethod === "cheque" && <p className="mt-3 text-sm text-muted-foreground">{t("success.payCheque")}</p>}
              </div>
              {showCard && (
                <PayCard
                  method={payMethod === "bank" ? "bank" : "upi"}
                  info={info[p.order_id] ?? null}
                  amount={info[p.order_id]?.grandTotal ?? p.grand_total}
                  orderNo={p.order_no}
                  hold={holds[p.order_id]}
                  onPaid={() =>
                    setProofFor({ orderId: p.order_id, orderNo: p.order_no, amount: p.grand_total, method: payMethod === "bank" ? "bank" : "upi" })
                  }
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-3 pt-8">
        <button
          type="button"
          onClick={() => navigate({ to: "/track/$id", params: { id: parts[0]?.order_id ?? "" } })}
          disabled={parts.length === 0}
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:opacity-50"
        >
          {t("pay.viewOrder")}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-border bg-card text-base font-semibold text-foreground transition active:scale-[0.98]"
        >
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

