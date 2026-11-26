import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Factory, Truck } from "lucide-react";
import en from "@/locales/en.json";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { formatINR } from "@/lib/catalogue";
import { serverMessage } from "@/lib/form-errors";
import { indDate } from "@/lib/order-format";
import { markOrdersSeen } from "@/lib/orders";
import { readSwr, swr } from "@/lib/swr-cache";
import { TONE_CLASS, fetchMyMainOrders, matchesOrderFilter, orderFilterCounts, orderItemCounts, needsAction, showTotal, sortForAction, statusTone, type MainOrder, type OrderFilter } from "@/lib/quote-flow";

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
  const [orders, setOrders] = useState<MainOrder[] | null>(() => readSwr<MainOrder[]>("orders.main"));
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const chipsRef = useRef<HTMLDivElement>(null);
  const [moreChips, setMoreChips] = useState(false);
  const updateChipFade = useCallback(() => {
    const row = chipsRef.current;
    if (row) setMoreChips(row.scrollWidth - row.clientWidth - row.scrollLeft > 2);
  }, []);
  useEffect(() => {
    const row = chipsRef.current;
    if (!row) return;
    const observer = new ResizeObserver(updateChipFade);
    observer.observe(row);
    updateChipFade();
    void document.fonts.ready.then(updateChipFade);
    return () => observer.disconnect();
  }, [lang, orders, updateChipFade]);

  const load = useCallback(async (force = true) => {
    try { setOrders(await swr("orders.main", fetchMyMainOrders, force)); setError(null); }
    catch (e) { setError(serverMessage(e, t("common.loadError"))); }
  }, [t]);
  useEffect(() => { void load(); markOrdersSeen(); }, [load]);
  useDataRefresh(() => load(true), () => load(true));

  const list = useMemo(() => sortForAction(orders ?? []).filter((o) => matchesOrderFilter(o.status, filter)), [orders, filter]);
  const counts = useMemo(() => orderFilterCounts(orders ?? []), [orders]);

  return (
    <PageShell className={deva} onRefresh={() => load(true)}>
      <header className="sticky top-0 z-30 bg-background/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="px-2 text-2xl font-bold text-primary">{t("track.title")}</h1>
        <div className="relative mt-3">
        <div ref={chipsRef} onScroll={updateChipFade} role="group" aria-label={t("track.filters")} className="no-scrollbar flex gap-2 overflow-x-auto">
          {(["all", "action", "active", "done"] as const).map((f) => (
            <Button key={f} variant="ghost" type="button" aria-pressed={filter === f} onClick={(event) => { setFilter(f); event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }} className={`h-11 min-w-11 shrink-0 gap-0.5 rounded-full px-1 text-sm font-medium ${filter === f ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "bg-card text-foreground shadow-sm"}`}>{t(`quote.filter.${f}`)}{counts[f] > 0 && <span className="text-xs tabular-nums">· {counts[f]}</span>}</Button>
          ))}
        </div>
        {moreChips && <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent" />}
        </div>
      </header>
      <div className="px-5 pb-28 pt-2">
        {error && orders == null ? <ErrorState message={error} onRetry={() => void load()} /> :
         orders == null ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div> :
         orders.length === 0 ? (
          <div className="pt-10 text-center">
            <EmptyState title={t("track.emptyTitle")} body={t("track.emptyBody")} />
            <Button type="button" onClick={() => void navigate({ to: "/home" })} className="mt-4 min-h-12 rounded-xl px-6 font-semibold">{t("orders2.startShopping")}</Button>
          </div>
         ) : list.length === 0 ? <EmptyState title={t("reports.noMatches")} body="" /> : (
          <ul className="space-y-3">
            {list.map((o) => {
              const { items, packs } = orderItemCounts(o.lines);
              return (
                <li key={o.id}>
                  <Button variant="ghost" type="button" onClick={() => void navigate({ to: "/track/$id", params: { id: o.id } })} className={`block h-auto w-full whitespace-normal rounded-xl bg-card p-4 text-left shadow-sm ${needsAction(o.status) ? "ring-2 ring-secondary/60" : ""}`}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <p className="min-w-0 truncate text-sm font-bold text-primary">{o.orderNo}</p>
                      <span className={`max-w-32 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${TONE_CLASS[statusTone(o.status)]}`}>{t(`quote.status.${o.status}`, { defaultValue: t(`status.${o.status}`, { defaultValue: o.status }) })}</span>
                    </div>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">{indDate(o.createdAt, lang)}</p>
                    <p className="mt-2 text-sm text-foreground">{t("quote.itemCount", { count: items })} · {t("quote.packs", { count: packs })}{showTotal(o.status, o.grandTotal) && <span className="font-bold text-primary"> · {formatINR(o.grandTotal ?? 0)}</span>}</p>
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      {o.deliveryMode === "pickup" ? <Factory className="h-3.5 w-3.5 shrink-0" /> : <Truck className="h-3.5 w-3.5 shrink-0" />}{indDate(o.deliveryDate, lang)}
                    </div>
                  </Button>
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
