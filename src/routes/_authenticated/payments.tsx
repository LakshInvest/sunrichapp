import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Wallet } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorState, EmptyState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { formatINR } from "@/lib/catalogue";
import { fetchCreditStatus, fetchMyOrders, statusGroup, type CreditStatus, type OrderDto } from "@/lib/orders";
import { dateLabel, statusChipClass } from "@/lib/order-format";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: en.payments.metaTitle },
      { name: "description", content: en.payments.metaDescription },
      { property: "og:title", content: en.payments.metaTitle },
      { property: "og:description", content: en.payments.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Payments,
});

function Payments() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const deva = lang === "en" ? "" : "font-deva";

  const [credit, setCredit] = useState<CreditStatus | null>(null);
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cs, list] = await Promise.all([fetchCreditStatus(), fetchMyOrders()]);
      setCredit(cs);
      setOrders(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const unpaidCreditOrders = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => o.paymentMode === "credit" && o.grandTotal > 0 && statusGroup(o.status) !== "cancelled")
        .filter((o) => Math.max(0, o.grandTotal - o.paidAmount) > 0)
        .map((o) => ({ ...o, outstanding: Math.max(0, o.grandTotal - o.paidAmount) })),
    [orders],
  );

  const deliveredOrders = useMemo(() => (orders ?? []).filter((o) => statusGroup(o.status) === "delivered"), [orders]);

  const hasCredit = credit != null && credit.out_limit > 0;
  const used = credit ? Math.max(0, credit.out_limit - credit.out_available) : 0;
  const usedPct = credit && credit.out_limit > 0 ? Math.min(100, Math.round((used / credit.out_limit) * 100)) : 0;

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-16 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/account" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("payments.title")}</p>
      </header>

      <div className="px-5 pt-5">
        {error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : orders == null ? (
          <div className="mt-2 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : hasCredit && credit ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Wallet className="h-4 w-4 text-secondary" aria-hidden />
                {t("payments.creditTitle")}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-sm text-muted-foreground">{t("payments.used")}</p>
                <p className="text-sm font-bold text-foreground">
                  {formatINR(used)} / {formatINR(credit.out_limit)}
                </p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${usedPct >= 100 ? "bg-destructive" : "bg-secondary"}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("payments.available")}</span>
                <span className="font-bold text-primary">{formatINR(credit.out_available)}</span>
              </div>
              {credit.out_overdue > 0 && (
                <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  {t("payments.overdue", { amount: formatINR(credit.out_overdue), days: credit.out_oldest_overdue_days })}
                </p>
              )}
              {credit.out_blocked && credit.out_block_reason && (
                <p className="mt-2 rounded-xl bg-accent/15 px-3 py-2 text-xs font-medium text-accent-foreground">
                  {credit.out_block_reason}
                </p>
              )}
            </section>

            <section className="mt-4">
              <h2 className="text-base font-bold text-foreground">{t("payments.unpaidTitle")}</h2>
              {unpaidCreditOrders.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{t("payments.noUnpaid")}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {unpaidCreditOrders.map((o) => {
                    const due = o.dueDate ?? o.deliveryDate ?? o.createdAt;
                    const overdue = o.dueDate ? new Date(`${o.dueDate}T23:59:59`).getTime() < Date.now() : false;
                    return (
                      <li key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-foreground">{o.orderNo}</p>
                          {overdue && (
                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                              {t("payments.overdueChip")}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{dateLabel(due, lang)}</span>
                          <span className="font-bold text-primary">{formatINR(o.outstanding)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-base font-bold text-foreground">{t("payments.payOnDelivery")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("payments.payOnDeliveryBody")}</p>
            </section>
            <section className="mt-4">
              <h2 className="text-base font-bold text-foreground">{t("payments.deliveredTitle")}</h2>
              {deliveredOrders.length === 0 ? (
                <EmptyState title={t("track.emptyTitle")} body={t("track.emptyBody")} />
              ) : (
                <ul className="mt-3 space-y-3">
                  {deliveredOrders.map((o) => (
                    <li key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-foreground">{o.orderNo}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusChipClass(o.status)}`}>
                          {t(`status.${o.status}`)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{dateLabel(o.deliveryDate ?? o.createdAt, lang)}</span>
                        <span className="font-bold text-primary">{formatINR(o.grandTotal)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <p className="mt-5 text-center text-xs text-muted-foreground">{t("payments.comingSoon")}</p>
      </div>
    </main>
  );
}
