import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, RefreshCw } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorState, EmptyState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { formatINR } from "@/lib/catalogue";
import {
  fetchMyOrders,
  itemsSummary,
  markOrdersSeen,
  statusGroup,
  type OrderDto,
  type OrderGroup,
} from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/track")({
  head: () => ({
    meta: [
      { title: en.track.metaTitle },
      { name: "description", content: en.track.metaDescription },
      { property: "og:title", content: en.track.metaTitle },
      { property: "og:description", content: en.track.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyOrders,
});

export function statusChipClass(status: string): string {
  if (status === "delivered" || status === "closed" || status === "approved") return "bg-secondary/15 text-primary";
  if (status === "cancelled" || status === "rejected") return "bg-destructive/10 text-destructive";
  if (status === "credit_hold") return "bg-accent/15 text-accent-foreground";
  return "bg-muted text-foreground";
}

export function dateLabel(iso: string | null, lang: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(lang === "en" ? "en-IN" : lang === "hi" ? "hi-IN" : "mr-IN", {
    day: "numeric",
    month: "short",
  });
}

function MyOrders() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";

  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderGroup>("active");

  const load = useCallback(async () => {
    try {
      const list = await fetchMyOrders();
      setOrders(list);
      setError(null);
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

  const switchCls = (active: boolean) =>
    `min-h-10 flex-1 rounded-full px-4 text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`;

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}
      onTouchStart={pull.handlers.onTouchStart}
      onTouchMove={pull.handlers.onTouchMove}
      onTouchEnd={pull.handlers.onTouchEnd}
      onTouchCancel={pull.handlers.onTouchCancel}
    >
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 pb-3 pt-6 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary">{t("track.title")}</h1>
        <div className="mt-3 flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button type="button" onClick={() => navigate({ to: "/order", search: { category: undefined } })} className={switchCls(false)}>
            {t("track.tabShop")}
          </button>
          <button type="button" aria-current="page" className={switchCls(true)}>
            {t("track.tabMyOrders")}
          </button>
        </div>
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
        ) : visible.length === 0 ? (
          <EmptyState title={t("track.emptyTitle")} body={t("track.emptyBody")} />
        ) : (
          <ul className="space-y-3">
            {visible.map((o) => {
              const s = itemsSummary(o.lines);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })}
                    className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-foreground">{o.orderNo}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(o.status)}`}>
                        {t(`status.${o.status}`)}
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
                </li>
              );
            })}
          </ul>
        )}
        {offline && orders != null && <p className="mt-3 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>

      <BottomNav />
    </main>
  );
}
