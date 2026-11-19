import { SchemeLinePrice } from "@/components/SchemeQuote";
import { fetchMyFeedback, planReorder, type OrderFeedback } from "@/lib/feedback";
import { RateOrderCard } from "@/components/RateOrderCard";
import { Button } from "@/components/ui/button";
import { SheetDrawer } from "@/components/SheetDrawer";
import { orderPayment, type OrderBill } from "@/lib/order-card";
import { supabase } from "@/integrations/supabase/client";
import { ownCustomerFilter } from "@/lib/my-customer";
import { getHomeExtras, onHomeExtras } from "@/lib/catalogue";
import { useAppSettings } from "@/lib/app-settings";
import { serverMessage } from "@/lib/form-errors";
import { readSwr, swr } from "@/lib/swr-cache";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { PageShell } from "@/components/PageShell";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw, Truck, Factory, Star } from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/SmartImage";
import { useCart } from "@/hooks/use-cart";
import { fetchInvoiceIdForOrder } from "@/lib/billing";
import { fetchCatalogue, readCatalogueCache } from "@/lib/catalogue";
import { BottomNav } from "@/components/BottomNav";
import { ErrorState, EmptyState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { formatINR } from "@/lib/catalogue";
import { indDate, statusChipClass } from "@/lib/order-format";
import {
  fetchMyOrders,
  markOrdersSeen,
  statusGroup,
  buildTimeline,
  type OrderDto,
} from "@/lib/orders";
import en from "@/locales/en.json";
import { filterOrderHistory, type OrderFilters } from "@/lib/report-rules";
import { khataRange } from "@/lib/khata";
import { istToday } from "@/lib/ist";

export const Route = createFileRoute("/_authenticated/track/")({
  head: () => ({ meta: [
    { title: en.track.metaTitle },
    { name: "description", content: en.track.metaDescription },
    { property: "og:title", content: en.track.metaTitle },
    { property: "og:description", content: en.track.metaDescription },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MyOrders,
});

function MyOrders() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";

  const [orders, setOrders] = useState<OrderDto[] | null>(() => readSwr<OrderDto[]>("orders"));
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<Record<string, OrderBill> | null>(null);
  const [ratings, setRatings] = useState<Record<string, OrderFeedback> | null>(null);
  const [ratingOrder, setRatingOrder] = useState<OrderDto | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({ status: "all", range: "thisMonth", ...khataRange("thisMonth"), search: "" });
  const [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sunrich.orderFilters") ?? "null") as Partial<OrderFilters> | null;
      if (saved && ["all", "active", "delivered", "cancelled"].includes(saved.status ?? "") && ["thisMonth", "lastMonth", "custom"].includes(saved.range ?? "")) setFilters((old) => ({ ...old, ...saved, search: typeof saved.search === "string" ? saved.search : "", from: /^\d{4}-\d{2}-\d{2}$/.test(saved.from ?? "") ? saved.from ?? old.from : old.from, to: /^\d{4}-\d{2}-\d{2}$/.test(saved.to ?? "") ? saved.to ?? old.to : old.to }));
    } catch { /* keep defaults */ }
    setFiltersReady(true);
  }, []);
  useEffect(() => { if (filtersReady) try { localStorage.setItem("sunrich.orderFilters", JSON.stringify(filters)); } catch { /* storage unavailable */ } }, [filters, filtersReady]);
  const [homeExtras, setHomeExtras] = useState(() => getHomeExtras());
  const settings = useAppSettings();
  useEffect(() => onHomeExtras(setHomeExtras), []);

  const load = useCallback(async () => {
    try {
      const list = await swr("orders", fetchMyOrders);
      setOrders(list);
      setError(null);
      const cid = await ownCustomerFilter();
      const { data: invoices, error: billError } = await supabase.from("invoices").select("id, order_id, invoice_no, grand_total, amount_paid").eq("customer_id", cid).neq("status", "cancelled").order("invoice_date");
      if (billError) throw billError;
      setBills(Object.fromEntries((invoices ?? []).map((b) => [b.order_id, { id: b.id, no: b.invoice_no, total: Number(b.grand_total), paid: Number(b.amount_paid) }])));
      fetchMyFeedback(list.filter((o) => statusGroup(o.status) === "delivered").map((o) => o.id)).then(setRatings, (e) => console.warn("order ratings", e));
    } catch (e) {
      setError(serverMessage(e, t("common.loadError")));
      throw e;
    }
  }, [t]);

  useEffect(() => {
    void load().catch(() => undefined);
    markOrdersSeen();

  }, [load]);

  useDataRefresh(load, true);
  const pull = usePullToRefresh(load);

  const period = filters.range === "custom" ? { from: filters.from, to: filters.to } : khataRange(filters.range);
  const filtered = useMemo(() => filterOrderHistory(orders ?? [], filters, period.from, period.to), [orders, filters, period.from, period.to]);
  const active = filtered.filter((o) => statusGroup(o.status) === "active");
  const past = filtered.filter((o) => statusGroup(o.status) !== "active");
  const { setQty } = useCart();
  const products = readCatalogueCache()?.products ?? [];
  const thumb = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p?.imageUrl ?? p?.images[0] ?? null;
  };
  const reorder = async (o: OrderDto) => {
    const cat = readCatalogueCache() ?? (await fetchCatalogue().catch(() => null));
    const { add, skipped } = planReorder(o.lines, cat?.products ?? []);
    if (add.length === 0) return void toast.error(t("reorder.noneAvailable"));
    for (const line of add) setQty(line.productId, line.qty);
    if (skipped > 0) toast(t("reorder.someSkipped", { count: skipped }));
    await navigate({ to: "/cart" });
  };
  const openInvoice = async (o: OrderDto) => {
    const id = await fetchInvoiceIdForOrder(o.id).catch(() => null);
    if (id) await navigate({ to: "/invoice/$id", params: { id } });
    else await navigate({ to: "/track/$id", params: { id: o.id } });
  };

  const card = (o: OrderDto) => {
    const group = statusGroup(o.status);
    const status = o.status;
    const { steps, reached } = buildTimeline(o.status, o.history);
    const bill = bills?.[o.id];
    const payment = orderPayment(o, bill);
    const rating = ratings?.[o.id];
    return (
      <li key={o.id} className="rounded-2xl bg-card p-4 shadow-sm">
        <Button variant="ghost" type="button" onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })} className="block h-auto w-full whitespace-normal p-0 text-left hover:bg-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="break-words text-sm font-bold text-primary">{o.orderNo}</p><p className="mt-1 text-xs text-muted-foreground">{indDate(o.createdAt, lang)}</p></div>
            {group === "cancelled" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("status.cancelled")}</span>
            ) : (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusChipClass(status)}`}>{t(`status.${status}`)}</span>
            )}
          </div>
          <ul className="mt-3 space-y-2">{o.lines.map((l) => <li key={l.id} className="flex items-center gap-3"><SmartImage width={44} src={thumb(l.productId)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" /><span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{l.productName}</span><span className="shrink-0 text-sm text-muted-foreground">×{l.qty}</span>{(l.isFree || (l.discountAmount ?? 0) > 0) && <SchemeLinePrice gross={l.grossTotal} net={l.lineTotal} discount={l.discountAmount} free={l.isFree} info={l.schemeInfo} />}</li>)}</ul>
          <p className="mt-3 flex items-start gap-2 text-sm text-foreground">{o.deliveryMode === "pickup" ? <Factory className="h-4 w-4 shrink-0" /> : <Truck className="h-4 w-4 shrink-0" />}<span>{t(o.deliveryMode === "pickup" ? "orders2.pickup" : "orders2.delivery")} · {o.deliveryMode === "pickup" ? String(homeExtras?.pickup?.["unit_name"] ?? settings?.plantAddress ?? t("checkout2.plantDefault")) : o.deliveryDate ? indDate(o.deliveryDate, lang) : "—"}</span></p>
          {bill && <p className="mt-2 break-words text-xs text-muted-foreground">{t("orders2.billNo")} {bill.no}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className={`text-xs font-semibold ${payment.kind === "paid" ? "text-success" : "text-warning-foreground"}`}>{t("orders2.payment")}: {t(`orders2.paymentState.${payment.kind}`, { amount: formatINR(payment.due) })}</span><span className="text-base font-bold text-primary">{formatINR(o.grandTotal)}</span></div>
          {!!o.schemeDiscount && <p className="mt-2 text-xs font-semibold text-success">{t("offers.savings")} {formatINR(o.schemeDiscount)}</p>}
          {group === "active" && (
            <ol className="mt-3 flex gap-1" aria-hidden>
              {steps.map((st, i) => (
                <li key={st.key} className={`h-1 flex-1 rounded-full ${i <= reached ? "bg-secondary" : "bg-muted"}`} />
              ))}
            </ol>
          )}
        </Button>
        {group === "active" && o.status === "dispatched" && (
          <button type="button" onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })} className="mt-3 min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {t("track.trackBtn")}
          </button>
        )}
        {bills !== null && payment.canPay && (
          <button
            type="button"
            onClick={() => payment.kind === "credit" || group === "delivered" ? navigate({ to: "/khata/pay" }) : navigate({ to: "/track/$id", params: { id: o.id }, search: { pay: 1 } })}
            className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-warning/15 px-4 text-sm font-semibold text-warning-foreground"
          >
            <span>{formatINR(payment.due)}</span>
            <span className="text-xs font-bold">{t("pay.payNow")} →</span>
          </button>
        )}
        {group === "delivered" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void reorder(o)} className="min-h-11 rounded-xl border border-primary text-sm font-bold text-primary">
              {t("orders2.reorder")}
            </button>
            <button type="button" onClick={() => void openInvoice(o)} className="min-h-11 rounded-xl border border-border text-sm font-semibold text-foreground">
              {t("orders2.invoice")}
            </button>
          </div>
        )}
        {group === "delivered" && settings?.feedbackEnabled !== false && ratings !== null && <Button variant="ghost" className="mt-2 h-auto min-h-11 w-full flex-wrap justify-start gap-2 whitespace-normal px-0" disabled={offline || !!rating} onClick={() => setRatingOrder(o)}><span className="text-xs">{t(rating ? "feedback.yourRating" : "orders2.rate")}</span><span className="flex gap-1">{[1,2,3,4,5].map((n) => <Star key={n} className={`h-5 w-5 ${rating && n <= rating.rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />)}</span></Button>}
      </li>
    );
  };

  return (
    <PageShell>
      <header className="sticky top-0 z-30 bg-background/95 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary">{t("track.title")}</h1>
      </header>

      {pull.indicator && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center"
          style={{ transform: `translateY(${Math.max(0, pull.offset - 16)}px)` }}
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md ${pull.spinning ? "animate-spin" : ""}`}>
            <RefreshCw className="h-4 w-4 text-secondary" />
          </span>
        </div>
      )}

      <div className="px-5 pb-28 pt-2">
        <div className="mb-4 space-y-3">
          <input type="search" aria-label={t("reports.search")} placeholder={t("reports.search")} value={filters.search} onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))} className="min-h-12 w-full rounded-xl border border-input bg-card px-3 text-foreground" />
          <div className="grid grid-cols-4 gap-1" role="group" aria-label={t("track.title")}>{(["all", "active", "delivered", "cancelled"] as const).map((status) => <Button key={status} variant={filters.status === status ? "secondary" : "outline"} aria-pressed={filters.status === status} onClick={() => setFilters((old) => ({ ...old, status }))} className="h-auto min-h-11 whitespace-normal px-1 text-xs">{t(`reports.${status}`)}</Button>)}</div>
          <div className="grid grid-cols-3 gap-1">{(["thisMonth", "lastMonth", "custom"] as const).map((range) => <Button key={range} variant={filters.range === range ? "secondary" : "ghost"} aria-pressed={filters.range === range} onClick={() => setFilters((old) => ({ ...old, range }))} className="h-auto min-h-11 whitespace-normal px-1 text-xs">{t(`reports.${range}`)}</Button>)}</div>
          {filters.range === "custom" && <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-xs">{t("balance.from")}<input type="date" value={filters.from} max={filters.to} onChange={(e) => setFilters((old) => ({ ...old, from: e.target.value }))} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-2" /></label><label className="min-w-0 text-xs">{t("balance.to")}<input type="date" value={filters.to} min={filters.from} max={istToday()} onChange={(e) => setFilters((old) => ({ ...old, to: e.target.value }))} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-2" /></label></div>}
        </div>
        {error && orders !== null && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        {error && orders == null ? (
          <ErrorState message={error} onRetry={() => void load().catch(() => undefined)} />
        ) : orders == null ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="pt-10 text-center">
            <EmptyState title={t("track.emptyTitle")} body={t("track.emptyBody")} />
            <button type="button" onClick={() => navigate({ to: "/home" })} className="mt-4 min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">
              {t("orders2.startShopping")}
            </button>
          </div>
        ) : (
          <>
            {filtered.length === 0 && <EmptyState title={t("reports.noMatches")} body="" />}
            {active.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold text-muted-foreground">{t("orders2.active")}</h2>
                <ul className="space-y-3" data-testid="orders-active">{active.map(card)}</ul>
              </section>
            )}
            {past.length > 0 && (
              <section className={active.length > 0 ? "mt-6" : ""}>
                <h2 className="mb-2 text-sm font-bold text-muted-foreground">{t("orders2.past")}</h2>
                <ul className="space-y-3" data-testid="orders-past">{past.map(card)}</ul>
              </section>
            )}
          </>
        )}
        {offline && orders != null && <p className="mt-3 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>

      <BottomNav />
      <SheetDrawer open={!!ratingOrder} onOpenChange={(open) => !open && setRatingOrder(null)}>{ratingOrder && <div className="px-5 pb-6"><RateOrderCard orderId={ratingOrder.id} orderNo={ratingOrder.orderNo} onDone={(rating) => { setRatings((old) => ({ ...old, [ratingOrder.id]: { orderId: ratingOrder.id, rating, tags: [], comment: null } })); setRatingOrder(null); }} /></div>}</SheetDrawer>
    </PageShell>
  );
}
