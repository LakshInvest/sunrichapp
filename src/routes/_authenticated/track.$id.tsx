import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SlotText } from "@/components/SlotText";
import { DeliveredLines, DeliveryOtpCard, PickupPass, ProofOfDelivery } from "@/components/OrderExtras";
import { fetchDeliveryProof, showDeliveryOtp, type DeliveryProof } from "@/lib/delivery";
import { toast } from "sonner";
import { ArrowLeft, Ban, FileText, HelpCircle, Loader2, Repeat2, Truck } from "lucide-react";
import { fetchInvoiceIdForOrder } from "@/lib/billing";
import {
  awaitingPayment,
  canChangePayMethod,
  fetchMyPaymentProofs,
  fetchPaymentHold,
  latestProofFor,
  releaseLine,
  setOrderPaymentMethod,
  type PayMethod,
  type PaymentProof,
} from "@/lib/payments";
import { PayCard } from "@/components/PayCard";
import { getFirmPaymentInfo, type FirmPayInfo } from "@/lib/payments.functions";
import { PaymentProofSheet, PaymentStatusNote, type ProofTarget } from "@/components/PaymentProofSheet";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SheetDrawer } from "@/components/SheetDrawer";
import { MapPin } from "lucide-react";
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { formatINR, readCatalogueCache, fetchCatalogue } from "@/lib/catalogue";
import { canCustomerCancel, useAppSettings, waLink } from "@/lib/app-settings";
import { canChangeDeliveryMode, setOrderDeliveryMode } from "@/lib/orders";
import { fetchMyFeedback, planReorder, type OrderFeedback } from "@/lib/feedback";
import { googleMapsLink } from "@/lib/maps";
import { RateOrderCard } from "@/components/RateOrderCard";
import { useIsDemo } from "@/hooks/use-demo";
import { openExternal } from "@/lib/native";
import { Phone, Star } from "lucide-react";
import {
  buildTimeline,
  cancelMyOrder,
  fetchMyOrders,
  type OrderDto,
} from "@/lib/orders";
import { DEFAULT_LOCATION } from "@/components/locationShared";
import { dateLabel, statusChipClass } from "@/lib/order-format";

export const Route = createFileRoute("/_authenticated/track/$id")({
  head: () => ({
    meta: [
      { title: en.trackDetail.metaTitle },
      { name: "description", content: en.trackDetail.metaDescription },
      { property: "og:title", content: en.trackDetail.metaTitle },
      { property: "og:description", content: en.trackDetail.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { pay?: 1 } => (s["pay"] ? { pay: 1 } : {}),
  component: OrderDetail,
});

const MapPreview = lazy(() => import("@/components/MapPreview"));

function OrderDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const { setQty } = useCart();
  const deva = lang === "en" ? "" : "font-deva";

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<OrderFeedback | null | undefined>(undefined);
  const [proof, setProof] = useState<DeliveryProof | null>(null);
  const [payProof, setPayProof] = useState<PaymentProof | null>(null);
  const [payHold, setPayHold] = useState(false);
  const [payTarget, setPayTarget] = useState<ProofTarget | null>(null);
  const [payInfo, setPayInfo] = useState<FirmPayInfo | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const { pay: wantPay } = Route.useSearch();
  const settings = useAppSettings();
  const isDemo = useIsDemo();

  const load = useCallback(async () => {
    try {
      const list = await fetchMyOrders();
      const found = list.find((o) => o.id === id) ?? null;
      setOrder(found);
      setError(found ? null : "not-found");
      if (found) {
        setInvoiceId(await fetchInvoiceIdForOrder(found.id).catch(() => null));
        if (["dispatched", "delivered", "closed"].includes(found.status))
          setProof(await fetchDeliveryProof(found.id).catch(() => null));
        if (["placed", "credit_hold"].includes(found.status) && ["upi", "bank"].includes(found.paymentMethod ?? "")) {
          setPayHold(await fetchPaymentHold(found.id));
        } else {
          setPayHold(false);
        }
        if (["upi", "bank"].includes(found.paymentMethod ?? "")) {
          getFirmPaymentInfo({ data: { orderIds: [found.id] } }).then((r) => setPayInfo(r[found.id] ?? null), () => undefined);
        }
        const proofs = await fetchMyPaymentProofs().catch(() => [] as PaymentProof[]);
        setPayProof(latestProofFor(proofs, found.id));
        if (found.status === "delivered" || found.status === "closed")
          setFeedback((await fetchMyFeedback([found.id]).catch(() => ({}) as Record<string, OrderFeedback>))[found.id] ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (wantPay && order) setTimeout(() => document.getElementById("pay-now")?.scrollIntoView({ behavior: "smooth" }), 300);
  }, [wantPay, order?.id]);

  const chooseMethod = async (m: PayMethod) => {
    if (!order || savingMethod) return;
    setSavingMethod(true);
    try {
      await setOrderPaymentMethod([order.id], m);
      toast.success(t("pay.methodChanged"));
      setMethodOpen(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingMethod(false);
    }
  };

  if (error === "not-found") {
    return (
      <main className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}>
        <OfflineBanner />
        <div className="px-5 pt-6">
          <ErrorState message={t("track.notFound")} onRetry={() => void load()} />
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}>
        <OfflineBanner />
        <div className="mt-6 space-y-3 px-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  const { steps, reached } = buildTimeline(order.status, order.history);
  // Never "Confirmed" while a UPI / bank payment is still pending.
  const payPending = ["upi", "bank"].includes(order.paymentMethod ?? "") && payProof?.status !== "verified" && order.paymentStatus !== "paid";
  const shownStatus = order.status === "approved" && payPending ? "placed" : order.status;
  const cancellable = canCustomerCancel(order.status, settings?.allowCancelBefore ?? "approved");
  const pastCancel = !cancellable && ["approved", "processing", "dispatched"].includes(order.status);
  const isDelivered = order.status === "delivered" || order.status === "closed";
  const isCancelled = order.status === "cancelled" || order.status === "rejected";
  const cancelNote = order.status === "cancelled" ? order.cancelReason : order.status === "rejected" ? order.holdReason : null;
  const addrLines = [
    order.deliveryAddressLine1,
    order.deliveryAddressLine2,
    order.deliveryLandmark,
    order.deliveryCity,
    order.deliveryPincode,
  ].filter(Boolean);
  const mapLat = order.deliveryLatitude ?? DEFAULT_LOCATION.lat;
  const mapLng = order.deliveryLongitude ?? DEFAULT_LOCATION.lng;

  const doCancel = async () => {
    if (!reason.trim() || cancelling) return;
    setCancelling(true);
    try {
      await cancelMyOrder(order.id, reason.trim());
      toast.success(t("trackDetail.cancelled"));
      setCancelOpen(false);
      setReason("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const switchMode = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await setOrderDeliveryMode(order.id, order.deliveryMode === "pickup" ? "sunrich" : "pickup", null);
      toast.success(t("delivery.changed"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  const reorder = async () => {
    if (reordering) return;
    setReordering(true);
    try {
      const cat = readCatalogueCache() ?? (await fetchCatalogue().catch(() => null));
      const { add, skipped } = planReorder(order.lines, cat?.products ?? []);
      if (add.length === 0) {
        toast.error(t("reorder.noneAvailable"));
        return;
      }
      for (const line of add) setQty(line.productId, line.qty);
      if (skipped > 0) toast(t("reorder.someSkipped", { count: skipped }));
      await navigate({ to: "/cart" });
    } finally {
      setReordering(false);
    }
  };

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-16 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/track" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{order.orderNo}</p>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(shownStatus)}`}>
          {t(`status.${shownStatus}`)}
        </span>
      </header>

      <div className="px-5 pt-5">
        {/* Timeline */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-bold text-foreground">{t("trackDetail.timelineTitle")}</p>
          {isCancelled ? (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {t(`status.${order.status}`)}
              {cancelNote ? ` — ${cancelNote}` : ""}
            </p>
          ) : (
            <ol className="mt-4">
              {steps.map((step, i) => {
                const current = i === reached;
                const isLast = i === steps.length - 1;
                const time = step.time ? dateLabel(step.time, lang) : null;
                return (
                  <li key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          i < reached || (current && step.time)
                            ? "border-secondary bg-secondary"
                            : current
                              ? "animate-pulse border-secondary bg-background"
                              : "border-border bg-background"
                        }`}
                      >
                        {(i < reached || (current && step.time)) && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      {!isLast && <span className={`h-8 w-0.5 ${i < reached ? "bg-secondary" : "bg-border"}`} />}
                    </div>
                    <div className={isLast ? "pb-0" : "pb-2"}>
                      <p className={`text-sm font-semibold ${current && !step.time ? "text-primary" : i < reached || step.time ? "text-foreground" : "text-muted-foreground"}`}>
                        {t(`trackDetail.step.${step.key}`)}
                      </p>
                      {time && <p className="text-xs text-muted-foreground">{time}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {order.status === "credit_hold" && (
            <p className="mt-3 rounded-xl bg-accent/15 px-3 py-2 text-xs font-medium text-accent-foreground">
              {t("delivery.creditHold")}
            </p>
          )}
          {(() => {
            const rl = releaseLine(order);
            if (!rl) return null;
            return (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-secondary" data-testid="dispatch-line">
                <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t(`dispatch.${rl.key}`, { time: rl.time, date: rl.date ? dateLabel(rl.date, lang) : undefined })}
              </p>
            );
          })()}
        </section>

        {/* Payment: pay-now card while a UPI / bank payment is due, then method + status */}
        {awaitingPayment(order, payProof?.status ?? null) && (
          <div id="pay-now" className="mt-4 scroll-mt-4">
            {payProof?.status === "rejected" && <PaymentStatusNote proof={payProof} />}
            <div className="mt-2">
              <PayCard
                method={order.paymentMethod === "bank" ? "bank" : "upi"}
                info={payInfo}
                amount={payInfo?.grandTotal ?? order.grandTotal}
                orderNo={order.orderNo}
                hold={payHold}
                title={t("pay.pendingTitle", { amount: formatINR(order.grandTotal) })}
                onPaid={() =>
                  setPayTarget({
                    orderId: order.id,
                    orderNo: order.orderNo,
                    amount: order.grandTotal,
                    method: order.paymentMethod === "bank" ? "bank" : "upi",
                  })
                }
              />
            </div>
          </div>
        )}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-foreground">{t("trackDetail.payMethodLabel")}</p>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
              {t(
                `trackDetail.payMethod.${order.paymentMethod ?? (order.paymentMode === "credit" ? "credit" : "cash")}`,
                { defaultValue: order.paymentMethod ?? "" },
              )}
            </span>
          </div>
          {payProof && payProof.status !== "rejected" && <PaymentStatusNote proof={payProof} />}
          {!payProof && payHold && !awaitingPayment(order, null) && <PaymentStatusNote proof={null} hold />}
          {canChangePayMethod(order.status) && payProof?.status !== "verified" && payProof?.status !== "pending" && (
            <button
              type="button"
              disabled={offline}
              onClick={() => setMethodOpen(true)}
              className="mt-3 min-h-11 text-sm font-semibold text-secondary disabled:opacity-50"
            >
              {t("pay.changeMethod")}
            </button>
          )}
        </section>

        {showDeliveryOtp(order.status, order.deliveryOtp) && <DeliveryOtpCard otp={order.deliveryOtp!} />}
        {order.deliveryMode === "pickup" && !isCancelled && !isDelivered && (
          <PickupPass order={order} lang={lang} offline={offline} onChanged={() => void load()} />
        )}

        {/* Lines */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <ul className="space-y-2.5">
            {order.lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {l.productName} · {t("common.packs", { count: l.qty })}
                  {l.packLabel ? <span className="text-muted-foreground"> · {l.packLabel}</span> : null}
                </span>
                <span className="font-medium text-foreground">{formatINR(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>{t("cart.itemTotal")}</span>
              <span className="font-medium text-foreground">{formatINR(order.itemsTotal)}</span>
            </div>
            {order.depositTotal > 0 && (
              <div className="flex justify-between">
                <span>{t("cart.jarDeposit")}</span>
                <span className="font-medium text-foreground">{formatINR(order.depositTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-foreground">
              <span>{t("cart.grandTotal")}</span>
              <span className="text-primary">{formatINR(order.grandTotal)}</span>
            </div>
          </div>
        </section>

        {proof && <DeliveredLines order={order} proof={proof} />}
        {proof && <ProofOfDelivery proof={proof} />}

        {/* Delivery mode */}
        <section className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("delivery.modeLabel")}</p>
            <p className="text-sm font-bold text-foreground">{t(`delivery.${order.deliveryMode}`)}</p>
            {order.deliveryMode === "pickup" && (
              <p className="text-xs text-muted-foreground">
                {t("delivery.pickupFrom")}
                {order.pickupVehicleNo ? ` · ${t("delivery.vehicleShown", { no: order.pickupVehicleNo })}` : ""}
              </p>
            )}
          </div>
          {canChangeDeliveryMode(order.status) && (
            <button
              type="button"
              onClick={() => void switchMode()}
              disabled={offline || switching}
              className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-xs font-semibold text-secondary disabled:opacity-50"
            >
              {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : t(order.deliveryMode === "pickup" ? "delivery.switchToSunrich" : "delivery.switchToPickup")}
            </button>
          )}
        </section>

        {/* Delivery address + map */}
        {order.deliveryMode !== "pickup" && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <MapPin className="h-4 w-4 text-secondary" aria-hidden />
            {t("checkout.addressTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{addrLines.join(", ") || "—"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("success.deliveredBy", {
              who: order.fulfillerCustomerId ? t("success.byDistributor") : t("success.bySunrich"),
            })}
            {order.deliveryDate ? ` · ${t("checkout.deliversOn", { date: dateLabel(order.deliveryDate, lang) })}` : ""}
            <SlotText value={order.deliverySlot} />
          </p>
          <div className="mt-3">
            <MapPreview lat={mapLat} lng={mapLng} className="h-36 w-full overflow-hidden rounded-xl border border-border" />
          </div>
          <a
            href={googleMapsLink(mapLat, mapLng)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-secondary"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t("location.openInMaps")}
          </a>
          {order.notes && <p className="mt-3 text-xs text-muted-foreground">{t("checkout.notesLabel")}: {order.notes}</p>}
        </section>
        )}

        {isDemo && (
          <p className="mt-4 rounded-xl bg-accent/15 px-4 py-2.5 text-center text-xs font-semibold text-foreground">{t("demo.orderBadge")}</p>
        )}

        {isDelivered && settings?.feedbackEnabled !== false && feedback === null && (
          <div className="mt-4">
            <RateOrderCard
              orderId={order.id}
              orderNo={order.orderNo}
              onDone={(r) => setFeedback(r ? { orderId: order.id, rating: r, tags: [], comment: null } : null)}
            />
          </div>
        )}
        {feedback && (
          <p className="mt-4 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            {t("feedback.yourRating")}
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-4 w-4 ${n <= feedback.rating ? "fill-accent text-accent" : ""}`} aria-hidden />
            ))}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 grid gap-3">
          {cancellable && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={offline}
              title={offline ? t("offline.hint") : undefined}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 text-base font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
            >
              <Ban className="h-5 w-5" aria-hidden />
              {t("trackDetail.cancelOrder")}
            </button>
          )}
          {pastCancel && (settings?.supportPhone || settings?.supportWhatsapp) && (
            <div className="rounded-xl bg-muted/60 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("trackDetail.cancelViaSupport")}</p>
              <button
                type="button"
                onClick={() =>
                  openExternal(
                    settings.supportWhatsapp
                      ? waLink(settings.supportWhatsapp, t("trackDetail.cancelWaMsg", { no: order.orderNo }))
                      : `tel:${settings.supportPhone}`,
                  )
                }
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground"
              >
                <Phone className="h-4 w-4 text-secondary" aria-hidden />
                {t("support.title")}
              </button>
            </div>
          )}
          {invoiceId && (
            <button
              type="button"
              onClick={() => navigate({ to: "/invoice/$id", params: { id: invoiceId } })}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              <FileText className="h-5 w-5" aria-hidden />
              {t("invoice.view")}
            </button>
          )}
          {order.lines.length > 0 && (
            <button
              type="button"
              onClick={() => void reorder()}
              disabled={offline || reordering}
              title={offline ? t("offline.hint") : undefined}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-50"
            >
              {reordering ? <Loader2 className="h-5 w-5 animate-spin" /> : <Repeat2 className="h-5 w-5 text-secondary" aria-hidden />}
              {reordering ? t("trackDetail.reordering") : t("trackDetail.reorder")}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: "/queries/ask", search: { topic: "order", order: order.orderNo } })}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-semibold text-foreground transition active:scale-[0.98]"
          >
            <HelpCircle className="h-5 w-5 text-secondary" aria-hidden />
            {t("trackDetail.needHelp")}
          </button>
        </div>
      </div>

      {/* Cancel reason sheet */}
      <SheetDrawer open={cancelOpen} onOpenChange={setCancelOpen}>
        <DrawerHeader>
          <DrawerTitle>{t("trackDetail.cancelTitle")}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("trackDetail.cancelOrder")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("trackDetail.reasonLabel")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder={t("trackDetail.reasonPlaceholder")}
              className="rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <button
            type="button"
            onClick={() => void doCancel()}
            disabled={cancelling || !reason.trim() || offline}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-destructive text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {cancelling ? t("trackDetail.cancelling") : t("trackDetail.cancelConfirm")}
          </button>
          {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        </div>
      </SheetDrawer>
      <SheetDrawer open={methodOpen} onOpenChange={setMethodOpen}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-foreground">{t("pay.changeMethod")}</h2>
          <div className="mt-4 space-y-2" role="radiogroup">
            {(["upi", "bank", "cash", "cheque"] as const).map((m) => {
              const on = order?.paymentMethod === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={savingMethod}
                  onClick={() => void chooseMethod(m)}
                  className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left disabled:opacity-60 ${on ? "border-secondary bg-secondary/5" : "border-border bg-card"}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{t(`checkout.payMethod.${m}`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`checkout.paySub.${m}`)}</span>
                  </span>
                  <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-secondary" : "border-border"}`}>
                    {on && <span className="h-2.5 w-2.5 rounded-full bg-secondary" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetDrawer>
      <PaymentProofSheet
        open={payTarget != null}
        onOpenChange={(o) => {
          if (!o) setPayTarget(null);
        }}
        target={payTarget}
        onDone={() => void load()}
      />
    </main>
  );
}
