import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Factory, Truck } from "lucide-react";
import en from "@/locales/en.json";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { ErrorState, EmptyState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { formatINR } from "@/lib/catalogue";
import { serverMessage } from "@/lib/form-errors";
import { indDate } from "@/lib/order-format";
import { markOrdersSeen } from "@/lib/orders";
import { readSwr, swr } from "@/lib/swr-cache";
import { TONE_CLASS, fetchMyMainOrders, needsAction, showTotal, sortForAction, statusTone, type MainOrder } from "@/lib/quote-flow";

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

type Filter = "all" | "action" | "active" | "done";

function MyOrders() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";
  const [orders, setOrders] = useState<MainOrder[] | null>(() => readSwr<MainOrder[]>("orders.main"));
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async (force = true) => {
    try { setOrders(await swr("orders.main", fetchMyMainOrders, force)); setError(null); }
    catch (e) { setError(serverMessage(e, t("common.loadError"))); }
  }, [t]);
  useEffect(() => { void load(); markOrdersSeen(); }, [load]);
  useDataRefresh(() => load(true), () => load(true));

  const list = useMemo(() => sortForAction(orders ?? []).filter((o) =>
    filter === "all" ? true :
    filter === "action" ? needsAction(o.status) :
    filter === "done" ? ["delivered", "closed", "cancelled", "rejected", "quote_rejected"].includes(o.status) :
    !["delivered", "closed", "cancelled", "rejected", "quote_rejected"].includes(o.status)), [orders, filter]);

  return (
    <PageShell className={deva} onRefresh={() => load(true)}>
      <header className="sticky top-0 z-30 bg-background/95 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary">{t("track.title")}</h1>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {(["all", "action", "active", "done"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-sm"}`}>{t(`quote.filter.${f}`)}</button>
          ))}
        </div>
      </header>
      <div className="px-5 pb-28 pt-2">
        {error && orders == null ? <ErrorState message={error} onRetry={() => void load()} /> :
         orders == null ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div> :
         orders.length === 0 ? (
          <div className="pt-10 text-center">
            <EmptyState title={t("track.emptyTitle")} body={t("track.emptyBody")} />
            <button type="button" onClick={() => void navigate({ to: "/home" })} className="mt-4 min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{t("orders2.startShopping")}</button>
          </div>
         ) : list.length === 0 ? <EmptyState title={t("reports.noMatches")} body="" /> : (
          <ul className="space-y-3">
            {list.map((o) => {
              const packs = o.lines.filter((l) => !l.isFree).reduce((s, l) => s + l.qty, 0);
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => void navigate({ to: "/track/$id", params: { id: o.id } })} className={`block w-full rounded-2xl bg-card p-4 text-left shadow-sm ${needsAction(o.status) ? "ring-2 ring-secondary/60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-primary">{o.orderNo}</p><p className="text-xs text-muted-foreground">{indDate(o.createdAt, lang)}</p></div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONE_CLASS[statusTone(o.status)]}`}>{t(`quote.status.${o.status}`, { defaultValue: t(`status.${o.status}`, { defaultValue: o.status }) })}</span>
                        {needsAction(o.status) && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">{t("quote.actionNeeded")}</span>}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground">{o.lines.filter((l) => !l.isFree).map((l) => `${l.name} ×${l.qty}`).join(", ")}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">{o.deliveryMode === "pickup" ? <Factory className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}{indDate(o.deliveryDate, lang)} · {t("quote.packs", { count: packs })}</span>
                      {showTotal(o.status, o.grandTotal) && <span className="text-base font-bold text-primary">{formatINR(o.grandTotal ?? 0)}</span>}
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
    </PageShell>
  );
}
