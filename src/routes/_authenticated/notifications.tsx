import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { serverMessage } from "@/lib/form-errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bell, CheckCheck, CheckCircle2, Clock, FileText, Inbox, PackageCheck, RefreshCw, Truck, Wallet, XCircle, type LucideIcon } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { dateLabel } from "@/lib/order-format";
import { emitNoticeArrived, fetchAppNotices, markNoticesRead, noticeKey, noticeVars, type AppNotice } from "@/lib/app-notices";
import { formatINR } from "@/lib/catalogue";
import { markNoticesSeen } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: `Notifications — Sunrich` },
      { name: "description", content: "Updates on your orders, bills and questions." },
      { property: "og:title", content: `Notifications — Sunrich` },
      { property: "og:description", content: "Updates on your orders, bills and questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

const ICON: Record<string, LucideIcon> = {
  request_received: Inbox,
  quote_ready: FileText,
  quote_expiry_reminder: Clock,
  quote_expired: RefreshCw,
  payment_verified: Wallet,
  payment_rejected: XCircle,
  payment_mode_changed: Wallet,
  dispatched: Truck,
  delivered: PackageCheck,
  other: Bell,
};

function Notifications() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [list, setList] = useState<AppNotice[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    return fetchAppNotices(50).then(
      (l) => { setList(l); markNoticesSeen(); },
      (e: Error) => setErr(serverMessage(e, t("errors.generic"))),
    );
  }, [t]);
  useEffect(() => { void load(); }, [load]);
  useDataRefresh(load);

  const locale = lang === "en" ? "en-IN" : `${lang}-IN`;
  const open = (n: AppNotice) => {
    if (!n.read_at) {
      setList((l) => l?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? l);
      void markNoticesRead([n.id]).then(emitNoticeArrived, () => undefined);
    }
    if (n.order_id) void navigate({ to: "/track/$id", params: { id: n.order_id } });
  };
  const readAll = () => {
    setList((l) => l?.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })) ?? l);
    void markNoticesRead(null).then(emitNoticeArrived, (e: Error) => setErr(serverMessage(e, t("errors.generic"))));
  };
  const unread = list?.some((n) => !n.read_at) ?? false;

  return (
    <PageShell onRefresh={load} className={`pb-10 ${lang === "en" ? "" : "font-deva"}`}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button type="button" onClick={() => navigate({ to: "/home" })} aria-label={t("registration.back")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold">{t("notices.title")}</h1>
        {unread && (
          <button type="button" onClick={readAll} className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-primary">
            <CheckCheck className="h-4 w-4" aria-hidden />{t("notices.markAll")}
          </button>
        )}
      </header>
      {err ? (
        <ErrorState message={err} onRetry={load} />
      ) : !list ? (
        <div className="space-y-2 px-5 pt-4" aria-busy>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={t("notices.empty")} body={t("notices.emptyBody")} icon={Bell} />
      ) : (
        <ul className="mx-4 mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {list.map((n) => {
            const key = noticeKey(n.event_key);
            const Icon = ICON[key] ?? Bell;
            const bad = key === "payment_rejected" || key === "quote_expired";
            const vars = noticeVars(n.values, locale, formatINR);
            return (
              <li key={n.id}>
                <button type="button" onClick={() => open(n)} className={`flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left transition ${n.read_at ? "hover:bg-muted/60" : "bg-secondary/10"}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bad ? "bg-destructive/10 text-destructive" : key === "delivered" || key === "payment_verified" ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"}`}>
                    {key === "delivered" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{t(`appNotice.${key}.title`)}</span>
                    <span className="mt-0.5 block text-sm text-foreground/80">{t(`appNotice.${key}.line`, vars)}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{dateLabel(n.created_at, lang)}</span>
                  </span>
                  {!n.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" aria-label={t("notices.unread")} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
