import { lineShort } from "@/lib/pack-label";
import { planReorder } from "@/lib/feedback";
import { readSwr, swr } from "@/lib/swr-cache";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
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

  const [orders, setOrders] = useState<OrderDto[] | null>(() => readSwr<OrderDto[]>("orders"));
  const [error, setError] = useState<string | null>(null);
  const [unpaid, setUnpaid] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const list = await swr("orders", fetchMyOrders);
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

  const active = useMemo(() => (orders ?? []).filter((o) => statusGroup(o.status) === "active"), [orders]);
  const past = useMemo(() => (orders ?? []).filter((o) => statusGroup(o.status) !== "active"), [orders]);
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
    const status = unpaid.has(o.id) && o.status === "approved" ? "placed" : o.status;
    const { steps, reached } = buildTimeline(o.status, o.history);
    const shownLines = o.lines.slice(0, 4);
    const summary = shownLines.map((l) => lineShort(l.packLabel, l.productName, l.qty)).join(", ") + (o.lines.length > 4 ? ` ${t("orders.moreItems", { count: o.lines.length - 4, defaultValue: `+${o.lines.length - 4} more` })}` : "");
    return (
      <li key={o.id} className="rounded-2xl bg-card p-4 shadow-sm">
        <button type="button" onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })} className="w-full text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{indDate(o.createdAt, lang)}</p>
            {group === "cancelled" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("status.cancelled")}</span>
            ) : (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusChipClass(status)}`}>{t(`status.${status}`)}</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex shrink-0 gap-1">
              {o.lines.slice(0, 3).map((l) => (
                <span key={l.productId} className="h-9 w-9 overflow-hidden rounded-lg border border-border bg-card">
                  <SmartImage width={36} src={thumb(l.productId)} alt="" className="h-9 w-9 object-contain p-0.5" />
                </span>
              ))}
            </div>
            <p className="line-clamp-2 min-w-0 flex-1 text-sm text-foreground">{summary}</p>
            <p className="shrink-0 text-sm font-bold text-primary">{formatINR(o.grandTotal)}</p>
          </div>
          {group === "active" && (
            <ol className="mt-3 flex gap-1" aria-hidden>
              {steps.map((st, i) => (
                <li key={st.key} className={`h-1 flex-1 rounded-full ${i <= reached ? "bg-secondary" : "bg-muted"}`} />
              ))}
            </ol>
          )}
        </button>
        {group === "active" && o.status === "dispatched" && (
          <button type="button" onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })} className="mt-3 min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {t("track.trackBtn")}
          </button>
        )}
        {unpaid.has(o.id) && (
          <button
            type="button"
            onClick={() => navigate({ to: "/track/$id", params: { id: o.id }, search: { pay: 1 } })}
            className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-warning/15 px-4 text-sm font-semibold text-warning-foreground"
          >
            <span>{t("pay.chip.pending")}</span>
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
    </PageShell>
  );
}
