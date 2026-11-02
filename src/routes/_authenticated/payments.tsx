import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronRight as Go, Wallet } from "lucide-react";
import { z } from "zod";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SheetDrawer } from "@/components/SheetDrawer";
import { ErrorState, EmptyState, SlowNotice } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { formatINR } from "@/lib/catalogue";
import { istMonth } from "@/lib/ist";
import { fetchCreditStatus, type CreditStatus } from "@/lib/orders";
import {
  fetchOpenBills,
  fetchPaidBills,
  fetchReceipts,
  fetchStatement,
  type OpenBill,
  type PaidBill,
  type Receipt,
  type StatementRow,
} from "@/lib/billing";
import { dateLabel } from "@/lib/order-format";
import { fetchMyPaymentProofs, signedProofUrl, type PaymentProof } from "@/lib/payments";
import { PaymentProofSheet, ProofChip, type ProofTarget } from "@/components/PaymentProofSheet";

const TABS = ["bills", "payments", "statement", "mine"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/payments")({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
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

const thisMonth = istMonth;
function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const locale = (lang: string) => (lang === "en" ? "en-IN" : lang === "hi" ? "hi-IN" : "mr-IN");

function ListSkeleton() {
  return (
    <div className="mt-3 space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function Payments() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { tab: tabParam } = Route.useSearch();
  const tab: Tab = tabParam ?? "bills";
  const deva = lang === "en" ? "" : "font-deva";

  const [credit, setCredit] = useState<CreditStatus | null>(null);
  useEffect(() => {
    fetchCreditStatus().then(setCredit).catch(() => setCredit(null));
  }, []);

  const hasCredit = credit != null && credit.out_limit > 0;
  const used = credit ? Math.max(0, credit.out_limit - credit.out_available) : 0;
  const usedPct = credit && credit.out_limit > 0 ? Math.min(100, Math.round((used / credit.out_limit) * 100)) : 0;

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-16 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-2 py-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: "/account" })}
            aria-label={t("registration.back")}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("payments.title")}</p>
        </div>
        <div role="tablist" className="grid grid-cols-4 gap-1 px-4 pb-2">
          {TABS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              type="button"
              onClick={() => navigate({ to: "/payments", search: { tab: k }, replace: true })}
              className={`min-h-11 rounded-xl text-[13px] font-semibold transition ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`payments.tabs.${k}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 pt-5">
        {hasCredit && credit && tab === "bills" && (
          <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Wallet className="h-4 w-4 text-secondary" aria-hidden />
              {t("payments.creditTitle")}
            </p>
            <div className="mt-3 flex items-end justify-between gap-2">
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
          </section>
        )}
        {tab === "bills" && <BillsTab lang={lang} />}
        {tab === "payments" && <ReceiptsTab lang={lang} />}
        {tab === "statement" && <StatementTab lang={lang} />}
        {tab === "mine" && <MineTab lang={lang} />}
      </div>
    </main>
  );
}

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fn]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, load };
}

const loadBills = () => Promise.all([fetchOpenBills(), fetchPaidBills()]);

function BillsTab({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const { data, error, loading, load } = useLoad<[OpenBill[], PaidBill[]]>(loadBills);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data)
    return (
      <>
        <ListSkeleton />
        <SlowNotice loading={loading} onRetry={() => void load()} />
      </>
    );
  const [open, paid] = data;
  if (!open.length && !paid.length) return <EmptyState title={t("payments.noBillsTitle")} body={t("payments.noBillsBody")} />;
  const totalDue = open.reduce((s, b) => s + b.balance, 0);
  return (
    <>
      {open.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">{t("payments.openBills")}</h2>
            <p className="text-sm font-bold text-primary">{formatINR(totalDue)}</p>
          </div>
          <ul className="mt-3 space-y-3">
            {open.map((b) => {
              const isInvoice = /inv/i.test(b.kind);
              const body = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-bold text-foreground">{b.refNo}</p>
                    {b.daysOverdue > 0 && (
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                        {t("payments.overdueChip")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{dateLabel(b.billDate, lang)}</span>
                    <span>{t("payments.dueOn", { date: dateLabel(b.dueDate, lang) })}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t("payments.balance")}</span>
                    <span className="font-bold text-primary">{formatINR(b.balance)}</span>
                  </div>
                </>
              );
              return (
                <li key={b.refId}>
                  {isInvoice ? (
                    <Link
                      to="/invoice/$id"
                      params={{ id: b.refId }}
                      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {paid.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground">{t("payments.paidBills")}</h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
            {paid.map((b) => (
              <li key={b.id}>
                <Link to="/invoice/$id" params={{ id: b.id }} className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{b.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">{dateLabel(b.invoiceDate, lang)}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatINR(b.grandTotal)}</span>
                  <Go className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ReceiptsTab({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const { data, error, loading, load } = useLoad<Receipt[]>(fetchReceipts);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data)
    return (
      <>
        <ListSkeleton />
        <SlowNotice loading={loading} onRetry={() => void load()} />
      </>
    );
  if (!data.length) return <EmptyState title={t("payments.noReceiptsTitle")} body={t("payments.noReceiptsBody")} />;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {data.map((r) => (
        <li key={r.id} className="flex min-h-14 items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{r.receiptNo}</p>
            <p className="text-xs text-muted-foreground">
              {dateLabel(r.receiptDate, lang)} · {t(`payments.mode.${r.mode}`, { defaultValue: r.mode })}
            </p>
          </div>
          <span className={`text-sm font-bold ${r.status === "cancelled" ? "text-muted-foreground line-through" : "text-success"}`}>
            {formatINR(r.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MineTab({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ProofTarget | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [proofsTick, setProofsTick] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchMyPaymentProofs()
      .then((list) => active && setProofs(list))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [proofsTick]);

  const openShot = async (p: PaymentProof) => {
    const url = await signedProofUrl(p.screenshotPath).catch(() => null);
    if (url) {
      setShot(url);
    } else {
      toast.error(t("success.shotMissing"));
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => setProofsTick((v) => v + 1)} />;
  if (!proofs)
    return (
      <>
        <ListSkeleton />
        <SlowNotice loading onRetry={() => setProofsTick((v) => v + 1)} />
      </>
    );
  if (!proofs.length) return <EmptyState title={t("payments.mineEmptyTitle")} body={t("payments.mineEmptyBody")} />;
  return (
    <>
      <ul className="space-y-3">
        {proofs.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-bold text-foreground">
                {t(`payments.mode.${p.method}`, { defaultValue: p.method })}
                {p.orderNo ? ` · ${p.orderNo}` : ""}
              </p>
              <ProofChip status={p.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{dateLabel(p.paidOn, lang)}</span>
              <span className="font-bold text-primary">{formatINR(p.amount)}</span>
            </div>
            {p.reference && <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{p.reference}</p>}
            {p.status === "rejected" && p.rejectReason && (
              <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
                {p.rejectReason}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {p.screenshotPath && (
                <button
                  type="button"
                  onClick={() => void openShot(p)}
                  className="min-h-9 rounded-xl border border-border px-3 text-xs font-semibold text-secondary"
                >
                  {t("payments.viewShot")}
                </button>
              )}
              {p.status === "rejected" && (p.method === "upi" || p.method === "bank") && (
                <button
                  type="button"
                  onClick={() => setTarget({ orderId: p.orderId, orderNo: p.orderNo, amount: p.amount, method: p.method === "bank" ? "bank" : "upi" })}
                  className="min-h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  {t("success.sendAgain")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <PaymentProofSheet
        open={target != null}
        onOpenChange={(o) => {
          if (!o) setTarget(null);
        }}
        target={target}
        onDone={() => setProofsTick((v) => v + 1)}
      />
      <SheetDrawer open={shot != null} onOpenChange={(o) => !o && setShot(null)}>
        <div className="px-5 pb-8 pt-2">
          {shot && <img src={shot} alt={t("payments.viewShot")} className="max-h-[70vh] w-full rounded-xl bg-muted object-contain" />}
        </div>
      </SheetDrawer>
    </>
  );
}

function StatementTab({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState<string>(thisMonth);
  const fn = useMemo(() => () => fetchStatement(month), [month]);
  const { data, error, loading, load } = useLoad<StatementRow[]>(fn);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const label = new Date(y, m - 1, 1).toLocaleDateString(locale(lang), { month: "long", year: "numeric" });
  const closing = data?.at(-1)?.balance ?? 0;
  const atNow = month >= thisMonth();

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-1.5">
        <button
          type="button"
          onClick={() => setMonth((v) => shiftMonth(v, -1))}
          aria-label={t("payments.prevMonth")}
          className="flex h-11 w-11 items-center justify-center rounded-xl active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-sm font-bold text-foreground">{label}</p>
        <button
          type="button"
          disabled={atNow}
          onClick={() => setMonth((v) => shiftMonth(v, 1))}
          aria-label={t("payments.nextMonth")}
          className="flex h-11 w-11 items-center justify-center rounded-xl active:scale-95 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !data || loading ? (
        <>
          <ListSkeleton />
          <SlowNotice loading={loading} onRetry={() => void load()} />
        </>
      ) : !data.length ? (
        <EmptyState title={t("payments.noEntriesTitle")} body={t("payments.noEntriesBody")} />
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {data.map((r, i) => (
              <li key={`${r.refNo}-${i}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{r.details || r.refNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateLabel(r.date, lang)}
                      {r.refNo ? ` · ${r.refNo}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.debit > 0 && <p className="text-sm font-semibold text-foreground">{formatINR(r.debit)}</p>}
                    {r.credit > 0 && <p className="text-sm font-semibold text-success">−{formatINR(r.credit)}</p>}
                    <p className="text-[11px] text-muted-foreground">{formatINR(r.balance)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary/5 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{t("payments.closing")}</span>
            <span className="text-base font-bold text-primary">{formatINR(closing)}</span>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("payments.debit")} · {t("payments.credit")}
          </p>
        </>
      )}
    </>
  );
}
