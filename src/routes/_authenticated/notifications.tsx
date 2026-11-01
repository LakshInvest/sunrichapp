import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { serverMessage } from "@/lib/form-errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bell, CheckCircle2, FileText, MessageCircle, PauseCircle, Truck, Wallet, XCircle, type LucideIcon } from "lucide-react";
import en from "@/locales/en.json";
import { EmptyState, ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { dateLabel } from "@/lib/order-format";
import { fetchNotices, isUnread, markNoticesSeen, readNoticesSeen, type Notice, type NoticeKind } from "@/lib/notifications";
import { markOrdersSeen } from "@/lib/orders";

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

const ICON: Record<NoticeKind, LucideIcon> = {
  status: Bell,
  approved: CheckCircle2,
  credit_hold: PauseCircle,
  delivered: CheckCircle2,
  dispatched: Truck,
  cancelled: XCircle,
  invoice: FileText,
  reply: MessageCircle,
  pay_verified: Wallet,
  pay_verified_adv: Wallet,
  pay_rejected: XCircle,
};

function Notifications() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [list, setList] = useState<Notice[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    fetchNotices().then(
      (l) => {
        setSeen(readNoticesSeen());
        setList(l);
        markNoticesSeen();
        markOrdersSeen();
      },
      (e: Error) => setErr(serverMessage(e, t("errors.generic"))),
    );
  }, []);
  useEffect(load, [load]);

  const open = (n: Notice) => {
    if (n.target.to === "/track/$id") void navigate({ to: "/track/$id", params: { id: n.target.id } });
    else if (n.target.to === "/invoice/$id") void navigate({ to: "/invoice/$id", params: { id: n.target.id } });
    else if (n.target.to === "/khata") void navigate({ to: "/khata" });
    else void navigate({ to: "/queries/$id", params: { id: n.target.id } });
  };

  return (
    <PageShell className={`pb-10 ${lang === "en" ? "" : "font-deva"}`}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button type="button" onClick={() => navigate({ to: "/home" })} aria-label={t("registration.back")} className="flex h-11 w-11 items-center justify-center rounded-xl">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="text-base font-bold">{t("notices.title")}</h1>
      </header>
      {err ? (
        <ErrorState message={err} onRetry={load} />
      ) : !list ? (
        <div className="space-y-2 px-5 pt-4" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={t("notices.empty")} body={t("notices.emptyBody")} icon={Bell} />
      ) : (
        <ul className="mx-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {list.map((n) => {
            const Icon = ICON[n.kind];
            const unread = isUnread(n, seen);
            return (
              <li key={n.id}>
                <button type="button" onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${unread ? "bg-secondary/5" : "hover:bg-muted/60"}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.kind === "credit_hold" || n.kind === "cancelled" || n.kind === "pay_rejected" ? "bg-destructive/10 text-destructive" : "bg-secondary/15 text-secondary"}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t(`notices.kind.${n.kind}`, { status: n.status ? t(`status.${n.status}`, { defaultValue: n.status }) : "", ...n.params })}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {n.ref ? `${n.ref} · ` : ""}{dateLabel(n.at, lang)}
                    </span>
                  </span>
                  {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label={t("notices.unread")} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
