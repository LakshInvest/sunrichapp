import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BellRing } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { acceptPush, declinePush, shouldOfferPush } from "@/lib/push";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PaymentProofSheet, PaymentStatusNote, type ProofTarget } from "@/components/PaymentProofSheet";
import { PayCard } from "@/components/PayCard";
import { UpiReturnSheet } from "@/components/UpiReturnSheet";
import { dayAndDate } from "@/lib/order-format";
import { fetchMyOrders, type OrderDto } from "@/lib/orders";
import { formatINR } from "@/lib/catalogue";
import { useLang } from "@/hooks/use-lang";
import { fetchMyPaymentProofs, fetchPaymentHold, type PayMethod, type PaymentProof } from "@/lib/payments";
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

  const total = parts.reduce((a, p) => a + p.grand_total, 0);
  const dateOnly = deliveryDate ? dayAndDate(deliveryDate, lang) : "";
  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-5 pb-10 ${deva}`}>
      <OfflineBanner />
      <div className="flex flex-col items-center pt-12 text-center">
        <svg viewBox="0 0 96 96" className="h-16 w-16 shrink-0 overflow-visible" role="img" aria-label={t("success.title")}>
          <circle className="animate-check-ring" cx="48" cy="48" r="42" fill="none" stroke="var(--secondary)" strokeWidth="5" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="264" />
          <path className="animate-check-mark" d="M32 50 L44 62 L66 38" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" />
        </svg>
        <h1 className="mt-4 text-2xl font-bold text-primary">{t("success.done")}</h1>
        {parts.length > 0 && (
          <p className="mt-1 text-base font-semibold text-foreground" data-testid="delivery-line">
            {formatINR(total)}
            {dateOnly ? ` · ${t(isPickup ? "success.pickupOn" : "success.deliveryOn", { date: dateOnly })}` : ""}
          </p>
        )}
        {parts.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{parts.map((p) => p.order_no).join(" · ")}</p>}
      </div>

      <ul className="mt-6 w-full space-y-4">
        {parts.map((p) => {
          const proof = proofs.find((x) => x.orderId === p.order_id) ?? null;
          const showCard = (payMethod === "upi" || payMethod === "bank") && (!proof || proof.status === "rejected");
          return (
            <li key={p.order_id} className="space-y-3">
              {proof && <PaymentStatusNote proof={proof} />}
              {payMethod === "cash" && <p className="text-center text-sm text-muted-foreground">{t("success.payCash")}</p>}
              {payMethod === "cheque" && <p className="text-center text-sm text-muted-foreground">{t("success.payCheque")}</p>}
              {payMethod === "credit" && <p className="text-center text-sm text-muted-foreground">{t("success.payCredit")}</p>}
              {showCard && (
                <PayCard
                  method={payMethod === "bank" ? "bank" : "upi"}
                  info={info[p.order_id] ?? null}
                  amount={info[p.order_id]?.grandTotal ?? p.grand_total}
                  orderNo={p.order_no}
                  orderId={p.order_id}
                  hold={holds[p.order_id]}
                  title={parts.length > 1 ? `${t("upi.payNow")} · ${p.order_no}` : undefined}
                  onPaid={() =>
                    setProofFor({ orderId: p.order_id, orderNo: p.order_no, amount: p.grand_total, method: payMethod === "bank" ? "bank" : "upi" })
                  }
                />
              )}
            </li>
          );
        })}
      </ul>
      {(payMethod === "upi" || payMethod === "bank") && parts.length > 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("success.checkNote")}</p>
      )}

      <div className="mt-auto space-y-2 pt-8 text-center">
        <button
          type="button"
          onClick={() => navigate({ to: "/track/$id", params: { id: parts[0]?.order_id ?? "" } })}
          disabled={parts.length === 0}
          className="min-h-11 text-sm font-semibold text-secondary disabled:opacity-50"
        >
          {payMethod === "upi" || payMethod === "bank" ? t("success.payLater") : t("pay.viewOrder")} →
        </button>
      </div>
      <UpiReturnSheet
        onYes={(id) => {
          const p = parts.find((x) => x.order_id === id);
          if (p) setProofFor({ orderId: p.order_id, orderNo: p.order_no, amount: p.grand_total, method: "upi" });
        }}
      />
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

