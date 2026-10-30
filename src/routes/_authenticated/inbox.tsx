import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, CheckCheck, Clock, Copy, MapPin, Phone, X } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SheetDrawer } from "@/components/SheetDrawer";
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { formatINR } from "@/lib/catalogue";
import {
  distributorMarkDelivered,
  distributorRespond,
  fetchInboxOrders,
  inboxGroup,
  itemsSummary,
  type InboxTab,
  type OrderDto,
} from "@/lib/orders";
import { DEFAULT_LOCATION } from "@/components/locationShared";
import { dateLabel, statusChipClass } from "@/lib/order-format";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: en.inbox.metaTitle },
      { name: "description", content: en.inbox.metaDescription },
      { property: "og:title", content: en.inbox.metaTitle },
      { property: "og:description", content: en.inbox.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inbox,
});

const MapPreview = lazy(() => import("@/components/MapPreview"));

type ReasonKind = "reject" | "notDelivered" | null;

function Inbox() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";

  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<InboxTab>("new");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonKind, setReasonKind] = useState<ReasonKind>(null);
  const [reasonOrder, setReasonOrder] = useState<OrderDto | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const seenNew = useRef<Set<string> | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await fetchInboxOrders();
      const pending = list.filter((o) => o.distributorStatus === "pending").map((o) => o.id);
      // Vibrate once when a new order arrives while the app is open (not on first load).
      if (seenNew.current && pending.some((id) => !seenNew.current?.has(id))) {
        try {
          navigator.vibrate?.(200);
        } catch {
          /* unsupported */
        }
      }
      seenNew.current = new Set([...(seenNew.current ?? []), ...pending]);
      setOrders(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const counts = useMemo(() => {
    const map: Record<InboxTab, number> = { new: 0, toDeliver: 0, done: 0 };
    for (const o of orders ?? []) map[inboxGroup(o)] += 1;
    return map;
  }, [orders]);

  const visible = useMemo(() => (orders ?? []).filter((o) => inboxGroup(o) === tab), [orders, tab]);

  const respond = async (o: OrderDto, accept: boolean) => {
    if (busyId || offline) return;
    setBusyId(o.id);
    try {
      await distributorRespond(o.id, accept);
      toast.success(t(accept ? "inbox.accepted" : "inbox.rejected"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const markDelivered = async (o: OrderDto, delivered: boolean) => {
    if (busyId || offline) return;
    setBusyId(o.id);
    try {
      await distributorMarkDelivered(o.id, delivered);
      toast.success(t(delivered ? "inbox.markedDelivered" : "inbox.markedNotDelivered"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const submitReason = async () => {
    if (!reasonOrder || !reasonKind || !reason.trim() || sending) return;
    setSending(true);
    try {
      if (reasonKind === "reject") await distributorRespond(reasonOrder.id, false, reason.trim());
      else await distributorMarkDelivered(reasonOrder.id, false, reason.trim());
      toast.success(t("inbox.done"));
      setReasonKind(null);
      setReasonOrder(null);
      setReason("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const copyNumber = async (o: OrderDto) => {
    try {
      await navigator.clipboard.writeText(o.customerMobile ?? "");
      toast.success(t("inbox.copied"));
    } catch {
      toast.error(t("inbox.copyFailed"));
    }
  };

  const tabCls = (key: InboxTab) =>
    `min-h-10 flex-1 rounded-full px-3 text-sm font-semibold transition ${
      tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
    }`;

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-28 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 pb-3 pt-6 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary">{t("inbox.title")}</h1>
        <div className="mt-3 flex items-center gap-1 rounded-full border border-border bg-card p-1" role="group" aria-label={t("inbox.title")}>
          <button type="button" onClick={() => setTab("new")} aria-pressed={tab === "new"} className={tabCls("new")}>
            {t("inbox.tabNew")} {counts.new > 0 && <span className="text-xs opacity-80">{counts.new}</span>}
          </button>
          <button type="button" onClick={() => setTab("toDeliver")} aria-pressed={tab === "toDeliver"} className={tabCls("toDeliver")}>
            {t("inbox.tabToDeliver")} {counts.toDeliver > 0 && <span className="text-xs opacity-80">{counts.toDeliver}</span>}
          </button>
          <button type="button" onClick={() => setTab("done")} aria-pressed={tab === "done"} className={tabCls("done")}>
            {t("inbox.tabDone")}
          </button>
        </div>
      </header>

      <div className="px-5 pt-4">
        {error && orders == null ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : orders == null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">{t("inbox.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((o) => {
              const s = itemsSummary(o.lines, (n) => t("common.packs", { count: n }));
              const isNew = o.distributorStatus === "pending";
              return (
                <li
                  key={o.id}
                  className={`rounded-2xl border bg-card p-4 shadow-sm transition ${
                    isNew ? "border-secondary/50 shadow-secondary/20" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">{o.orderNo}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(o.status)}`}>
                      {t(`status.${o.status}`)}
                    </span>
                  </div>
                  {isNew && o.assignedAt && (() => {
                    const mins = Math.max(0, Math.floor((now - new Date(o.assignedAt).getTime()) / 60_000));
                    const late = mins >= 60;
                    return (
                      <p
                        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          late ? "bg-warning/15 text-warning" : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        <Clock className="h-3 w-3" aria-hidden />
                        {mins >= 60
                          ? t("inbox.waitingHours", { h: Math.floor(mins / 60), m: mins % 60 })
                          : t("inbox.waiting", { n: mins })}
                      </p>
                    );
                  })()}
                  <p className="mt-1 text-sm font-semibold text-foreground">{o.businessName || "—"}</p>
                  {(o.deliveryLine2 || o.deliveryLandmark || o.deliveryCity) && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[o.deliveryLine2, o.deliveryLandmark, o.deliveryCity].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel(o.deliveryDate ?? o.createdAt, lang)}{o.deliverySlot ? ` · ${o.deliverySlot}` : ""}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {s.first}
                      {s.more > 0 && <span className="text-muted-foreground"> {t("track.moreItems", { count: s.more })}</span>}
                    </p>
                    <p className="shrink-0 text-sm font-bold text-primary">{formatINR(o.grandTotal)}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {o.customerMobile && (
                      <>
                        <a
                          href={`tel:${o.customerMobile}`}
                          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition active:scale-95"
                        >
                          <Phone className="h-4 w-4 text-secondary" aria-hidden />
                          <span className="truncate">{o.customerMobile.replace(/^\+91/, "")}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => void copyNumber(o)}
                          aria-label={t("inbox.copyNumber")}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition active:scale-90"
                        >
                          <Copy className="h-4 w-4" aria-hidden />
                        </button>
                      </>
                    )}
                    <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden />
                      <span className="truncate">
                        {[o.deliveryCity, o.deliveryPincode].filter(Boolean).join(" · ") || t("inbox.mapFallback")}
                      </span>
                    </span>
                  </div>

                  <div className="mt-3">
                    <Suspense fallback={<div className="h-28 w-full animate-pulse rounded-xl bg-muted" />}>
                      <MapPreview lat={o.deliveryLatitude ?? DEFAULT_LOCATION.lat} lng={o.deliveryLongitude ?? DEFAULT_LOCATION.lng} className="h-28 w-full overflow-hidden rounded-xl border border-border" />
                    </Suspense>
                  </div>

                  {inboxGroup(o) === "new" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void respond(o, true)}
                        disabled={offline || busyId === o.id}
                        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" aria-hidden />
                        {t("inbox.accept")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReasonKind("reject");
                          setReasonOrder(o);
                          setReason("");
                        }}
                        disabled={offline || busyId === o.id}
                        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <X className="h-4 w-4" aria-hidden />
                        {t("inbox.cantDeliver")}
                      </button>
                    </div>
                  )}
                  {inboxGroup(o) === "toDeliver" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void markDelivered(o, true)}
                        disabled={offline || busyId === o.id}
                        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <CheckCheck className="h-4 w-4" aria-hidden />
                        {t("inbox.delivered")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReasonKind("notDelivered");
                          setReasonOrder(o);
                          setReason("");
                        }}
                        disabled={offline || busyId === o.id}
                        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <X className="h-4 w-4" aria-hidden />
                        {t("inbox.notDelivered")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {offline && <p className="mt-3 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>

      {/* Reason sheet */}
      <SheetDrawer
        open={reasonKind != null}
        onOpenChange={(open) => {
          if (!open) setReasonKind(null);
        }}
      >
        <DrawerHeader>
          <DrawerTitle>
            {reasonKind === "reject" ? t("inbox.cantDeliver") : t("inbox.notDelivered")}
          </DrawerTitle>
          <DrawerDescription className="sr-only">{t("inbox.reasonLabel")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t("inbox.reasonLabel")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder={t("inbox.reasonPlaceholder")}
              className="rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <button
            type="button"
            onClick={() => void submitReason()}
            disabled={sending || !reason.trim() || offline}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {sending ? t("inbox.sending") : t("inbox.reasonConfirm")}
          </button>
          {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        </div>
      </SheetDrawer>

      <BottomNav />
    </main>
  );
}
