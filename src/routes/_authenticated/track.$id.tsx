import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Ban, FileText, HelpCircle, Loader2, Repeat2 } from "lucide-react";
import { fetchInvoiceIdForOrder } from "@/lib/billing";
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
import { formatINR } from "@/lib/catalogue";
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
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchMyOrders();
      const found = list.find((o) => o.id === id) ?? null;
      setOrder(found);
      setError(found ? null : "not-found");
      if (found) setInvoiceId(await fetchInvoiceIdForOrder(found.id).catch(() => null));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

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
  const cancellable = order.status === "placed" || order.status === "credit_hold";
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

  const reorder = async () => {
    if (reordering) return;
    setReordering(true);
    try {
      for (const line of order.lines) setQty(line.productId, line.qty);
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
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(order.status)}`}>
          {t(`status.${order.status}`)}
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
          {order.status === "credit_hold" && order.holdReason && (
            <p className="mt-3 rounded-xl bg-accent/15 px-3 py-2 text-xs font-medium text-accent-foreground">
              {order.holdReason}
            </p>
          )}
        </section>

        {/* Lines */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <ul className="space-y-2.5">
            {order.lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {l.productName} ×{l.qty}
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
            <p className="pt-1 text-xs">
              {order.paymentMode === "credit" ? t("trackDetail.paidOnCredit") : t("trackDetail.paidOnDelivery")}
            </p>
          </div>
        </section>

        {/* Delivery address + map */}
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
            {order.deliverySlot ? ` · ${order.deliverySlot}` : ""}
          </p>
          <div className="mt-3">
            <Suspense fallback={<div className="h-36 w-full animate-pulse rounded-xl bg-muted" />}>
              <MapPreview lat={mapLat} lng={mapLng} />
            </Suspense>
          </div>
          {order.notes && <p className="mt-3 text-xs text-muted-foreground">{t("checkout.notesLabel")}: {order.notes}</p>}
        </section>

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
          {!isCancelled && order.lines.length > 0 && (
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
    </main>
  );
}
