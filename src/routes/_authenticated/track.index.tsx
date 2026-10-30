import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SlotText } from "@/components/SlotText";
import { ChevronRight, RefreshCw, Truck } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ErrorState, EmptyState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { formatINR } from "@/lib/catalogue";
import { statusChipClass, dateLabel } from "@/lib/order-format";
import {
  fetchMyOrders,
  itemsSummary,
  markOrdersSeen,
  statusGroup,
  buildTimeline,
  type OrderDto,
  type OrderGroup,
} from "@/lib/orders";
import { fetchOrdersAwaitingPayment } from "@/lib/pay-reminder";

export const Route = createFileRoute("/_authenticated/track/")({
  component: MyOrders,
});

function MyOrders() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";

  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderGroup>("active");
  const [unpaid, setUnpaid] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const list = await fetchMyOrders();
      setOrders(list);
      setError(null);
      fetchOrdersAwaitingPayment(list).then((u) => setUnpaid(new Set(u.map((o) => o.id))), () => undefined);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);

  useEffect(() => {
    void load();
    markOrdersSeen();
    const id = setInterval(() => void load().catch(() => undefined), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const pull = usePullToRefresh(load);

  const counts = useMemo(() => {
    const map: Record<OrderGroup, number> = { active: 0, delivered: 0, cancelled: 0 };
    for (const o of orders ?? []) map[statusGroup(o.status)] += 1;
    return map;
  }, [orders]);

  const visible = useMemo(() => (orders ?? []).filter((o) => statusGroup(o.status) === filter), [orders, filter]);

  // Newest active order gets the live card on top.
  const live = useMemo(() => (orders ?? []).find((o) => statusGroup(o.status) === "active") ?? null, [orders]);

  return (
    <main className="mx-auto min-h-screen max-w-md">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 pb-3 pt-6 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary">{t("track.title")}</h1>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="group" aria-label={t("track.filters")}>
          {(
            [
              ["active", "track.filterActive"],
              ["delivered", "track.filterDelivered"],
              ["cancelled", "track.filterCancelled"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${
                filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
              }`}
            >
              {t(label)}
              <span className="text-xs opacity-75">{counts[key]}</span>
            </button>
          ))}
        </div>
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

      <div className="px-5 pb-28 pt-4">
        {error && orders == null ? (
          <ErrorState message={error} onRetry={() => void load().catch(() => undefined)} />
        ) : orders == null ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {live && <LiveOrderCard order={live} lang={lang} onTrack={() => navigate({ to: "/track/$id", params: { id: live.id } })} />}
            {visible.length === 0 ? (
          <EmptyState title={t("track.emptyTitle")} body={t("track.emptyBody")} />
        ) : (
          <ul className="space-y-3">
            {visible.map((o) => {
              const s = itemsSummary(o.lines, (n) => t("common.packs", { count: n }));
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })}
                    className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-foreground">{o.orderNo}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(unpaid.has(o.id) && o.status === "approved" ? "placed" : o.status)}`}>
                        {t(`status.${unpaid.has(o.id) && o.status === "approved" ? "placed" : o.status}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{dateLabel(o.createdAt, lang)}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {s.first}
                        {s.more > 0 && <span className="text-muted-foreground"> {t("track.moreItems", { count: s.more })}</span>}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-primary">{formatINR(o.grandTotal)}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                  </button>
                  {unpaid.has(o.id) && (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/track/$id", params: { id: o.id }, search: { pay: 1 } })}
                      className="mt-1.5 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-warning/15 px-4 text-sm font-semibold text-warning-foreground"
                    >
                      <span>{t("pay.chip.pending")} · {formatINR(o.grandTotal)}</span>
                      <span className="rounded-full bg-warning px-3 py-1 text-xs font-bold text-primary">{t("pay.payNow")}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
            )}
          </>
        )}
        {offline && orders != null && <p className="mt-3 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>

      <BottomNav />
    </main>
  );
}

function LiveOrderCard({ order, lang, onTrack }: { order: OrderDto; lang: string; onTrack: () => void }) {
  const { t } = useTranslation();
  const { steps, reached } = buildTimeline(order.status, order.history);
  const current = steps[reached];
  return (
    <section className="mb-5 rounded-2xl bg-primary p-4 text-primary-foreground shadow-md" aria-label={t("track.liveTitle")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">{t("track.liveTitle")}</p>
        <p className="text-xs font-semibold text-primary-foreground/80">{order.orderNo}</p>
      </div>
      <p className="mt-1 text-lg font-bold">{current ? t(`trackDetail.step.${current.key}`) : t(`status.${order.status}`)}</p>
      <ol className="mt-3 flex gap-1" aria-hidden>
        {steps.map((s, i) => (
          <li key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= reached ? "bg-secondary" : "bg-primary-foreground/20"}`} />
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-primary-foreground/80">
        <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          {t("success.deliveredBy", { who: order.fulfillerCustomerId ? t("success.byDistributor") : t("success.bySunrich") })}
          {order.deliveryDate ? ` · ${dateLabel(order.deliveryDate, lang)}` : ""}
          <SlotText value={order.deliverySlot} />
        </span>
      </p>
      <button
        type="button"
        onClick={onTrack}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-primary-foreground text-sm font-bold text-primary transition active:scale-[0.99]"
      >
        {t("track.trackBtn")}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}
