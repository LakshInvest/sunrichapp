import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Clock, Download, FileText, IndianRupee, Loader2, Share2, XCircle } from "lucide-react";
import en from "@/locales/en.json";
import { PageShell } from "@/components/PageShell";
import { KhataBalanceCard } from "@/components/KhataBalanceCard";
import { SheetDrawer } from "@/components/SheetDrawer";
import { EmptyState, ErrorState } from "@/components/catalog/states";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/catalogue";
import { istToday } from "@/lib/ist";
import { dateLabel } from "@/lib/order-format";
import { getMyCustomerId } from "@/lib/orders";
import { fetchAppInfo } from "@/lib/app-info";
import { fetchOpenBills } from "@/lib/billing";
import { serverMessage } from "@/lib/form-errors";
import { shareOrDownload } from "@/lib/ledger";
import {
  fetchKhataEntries,
  fetchKhataProofs,
  fetchKhataSummary,
  filterEntries,
  khataRange,
  khataStatementPdf,
  passbookRows,
  type KhataEntry,
  type KhataProof,
  type KhataRange,
  type KhataSummary,
} from "@/lib/khata";

export const Route = createFileRoute("/_authenticated/khata")({
  head: () => ({
    meta: [
      { title: `${en.khata.title} — Sunrich` },
      { name: "description", content: en.khata.metaDescription },
      { property: "og:title", content: `${en.khata.title} — Sunrich` },
      { property: "og:description", content: en.khata.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KhataPage,
});

type Filter = "all" | "bills" | "payments";
const FILTERS: Filter[] = ["all", "bills", "payments"];
const RANGES: KhataRange[] = ["thisMonth", "lastMonth", "last3", "custom"];
const todayIso = () => istToday();

function KhataPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";

  const [sum, setSum] = useState<KhataSummary | null>(null);
  const [sumErr, setSumErr] = useState<string | null>(null);
  const [proofs, setProofs] = useState<KhataProof[]>([]);
  const [range, setRange] = useState<KhataRange>("last3");
  const [custom, setCustom] = useState(() => khataRange("thisMonth"));
  const period = range === "custom" ? custom : khataRange(range);
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<KhataEntry[] | null>(null);
  const [rowsErr, setRowsErr] = useState<string | null>(null);
  const [stmtOpen, setStmtOpen] = useState(false);

  const loadTop = useCallback(() => {
    setSumErr(null);
    fetchKhataSummary().then(setSum, (e) => setSumErr(serverMessage(e, t("errors.generic"))));
    fetchKhataProofs().then(setProofs, () => setProofs([]));
  }, [t]);
  useEffect(loadTop, [loadTop]);

  const loadRows = useCallback(() => {
    setRows(null);
    setRowsErr(null);
    fetchKhataEntries(period.from, period.to).then(setRows, (e) => setRowsErr(serverMessage(e, t("errors.generic"))));
  }, [period.from, period.to, t]);
  useEffect(loadRows, [loadRows]);

  // Pending at the top; rejected ones from the last 30 days so the reason is seen.
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
  const topProofs = proofs.filter((p) => p.status === "pending" || (p.status === "rejected" && (p.reviewedAt ?? p.createdAt) > cutoff));
  const list = rows ? filterEntries(passbookRows(rows), filter) : null;

  const openEntry = (r: KhataEntry) => {
    if (r.kind !== "bill") return;
    if (r.invoiceId) void navigate({ to: "/invoice/$id", params: { id: r.invoiceId } });
    else if (r.orderId) void navigate({ to: "/track/$id", params: { id: r.orderId } });
  };

  return (
    <PageShell className={`pb-28 ${deva}`} onRefresh={() => Promise.all([loadTop(), loadRows()])}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/account" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold">{t("khata.title")}</h1>
        <button
          type="button"
          onClick={() => setStmtOpen(true)}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-secondary"
        >
          <FileText className="h-4 w-4" aria-hidden /> {t("khata.statement")}
        </button>
      </header>

      <div className="space-y-5 px-5 pt-5">
        {sumErr ? <ErrorState message={sumErr} onRetry={loadTop} /> : <KhataBalanceCard sum={sum} />}

        {topProofs.length > 0 && (
          <section className="space-y-2" aria-label={t("khata.pendingTag")}>
            {topProofs.map((p) => (
              <ProofRow key={p.id} p={p} />
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold">{t("khata.passbook")}</h2>
          <div role="group" aria-label={t("khata.passbook")} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {RANGES.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={range === k}
                onClick={() => setRange(k)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                  range === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {t(`khata.stmt.${k}`)}
              </button>
            ))}
          </div>
          {range === "custom" && <DateRange value={custom} onChange={setCustom} />}
          <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`min-h-10 rounded-lg text-sm font-semibold ${filter === f ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                {t(`khata.filter.${f}`)}
              </button>
            ))}
          </div>

          {rowsErr ? (
            <ErrorState message={rowsErr} onRetry={loadRows} />
          ) : !list ? (
            <div className="mt-4 space-y-2" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState title={t("khata.noEntries")} body="" />
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="khata-entries">
              {list.map((r, i) => {
                const plus = r.debit > 0;
                const amt = plus ? r.debit : r.credit;
                return (
                  <li key={`${r.refNo}-${r.date}-${i}`}>
                    <button
                      type="button"
                      disabled={r.kind !== "bill"}
                      onClick={() => openEntry(r)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left disabled:cursor-default"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{t(`khata.kind.${r.kind}`)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {dateLabel(r.date, lang)}
                          {r.refNo ? ` · ${r.refNo}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`block text-sm font-bold ${plus ? "text-foreground" : "text-success"}`}>
                          {plus ? "+" : "−"}
                          {formatINR(amt)}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{r.balance < 0 ? t("khata.runningAdv", { amount: formatINR(-r.balance) }) : t("khata.runningBal", { amount: formatINR(r.balance) })}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          disabled={offline}
          onClick={() => navigate({ to: "/khata/pay" })}
          className="mx-auto flex h-auto min-h-[52px] w-full max-w-md rounded-xl text-base font-semibold"
        >
          <IndianRupee className="h-5 w-5" aria-hidden /> {t("khata.payNow")}
        </Button>
        {offline && <p className="mt-1 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>

      <StatementSheet open={stmtOpen} onOpenChange={setStmtOpen} />
    </PageShell>
  );
}

function ProofRow({ p }: { p: KhataProof }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const pending = p.status === "pending";
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${pending ? "border-dashed border-accent/60 bg-accent/10" : "border-destructive/30 bg-destructive/5"}`}
      data-testid={pending ? "proof-pending" : "proof-rejected"}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-semibold">
          {t("khata.kind.payment")} · {formatINR(p.amount)}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            pending ? "bg-accent/20 text-accent-foreground" : "bg-destructive/10 text-destructive"
          }`}
        >
          {pending ? <Clock className="h-3 w-3" aria-hidden /> : <XCircle className="h-3 w-3" aria-hidden />}
          {pending ? t("khata.pendingTag") : t("khata.rejectedTag")}
        </span>
      </div>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
        {dateLabel(p.paidOn || p.createdAt, lang)} · {t(`balance.mode.${p.method}`, { defaultValue: p.method })}
        {p.reference ? ` · ${p.reference}` : ""}
      </span>
      {pending ? (
        <span className="mt-1 block text-xs text-muted-foreground">{t("khata.pendingNote")}</span>
      ) : (
        p.rejectReason && <span className="mt-1 block text-xs font-medium text-destructive">{p.rejectReason}</span>
      )}
    </div>
  );
}

function DateRange({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  const { t } = useTranslation();
  const cls = "mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground";
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <label className="text-xs text-muted-foreground">
        {t("balance.from")}
        <input type="date" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} className={cls} />
      </label>
      <label className="text-xs text-muted-foreground">
        {t("balance.to")}
        <input type="date" value={value.to} min={value.from} max={todayIso()} onChange={(e) => onChange({ ...value, to: e.target.value })} className={cls} />
      </label>
    </div>
  );
}

function StatementSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [key, setKey] = useState<KhataRange>("thisMonth");
  const [custom, setCustom] = useState(() => khataRange("thisMonth"));
  const r = key === "custom" ? custom : khataRange(key);
  const [busy, setBusy] = useState<null | "share" | "download">(null);

  const make = async (mode: "share" | "download") => {
    setBusy(mode);
    try {
      const [rows, info, cid, bills] = await Promise.all([
        fetchKhataEntries(r.from, r.to),
        fetchAppInfo(),
        getMyCustomerId(),
        fetchOpenBills().catch(() => []),
      ]);
      let customer = "";
      if (cid) {
        const { data } = await supabase.from("customers").select("business_name, contact_name, mobile").eq("id", cid).maybeSingle();
        customer = [data?.business_name, data?.contact_name, data?.mobile].filter(Boolean).join(" · ");
      }
      const L = en.khata.stmt;
      const blob = await khataStatementPdf({
        company: info.company,
        address: info.address,
        customer,
        from: r.from,
        to: r.to,
        rows,
        unpaid: bills.map((b) => ({ refNo: b.refNo, billDate: b.billDate, dueDate: b.dueDate, balance: b.balance })),
        labels: {
          pdfTitle: L.pdfTitle,
          period: L.period,
          opening: L.opening,
          closing: L.closing,
          date: L.date,
          ref: L.ref,
          details: L.details,
          debit: L.debit,
          credit: L.credit,
          balance: L.balance,
          unpaid: L.unpaid,
          billNo: L.billNo,
          dueOn: L.dueOn,
          amountDue: L.amountDue,
          customer: L.customer,
        },
      });
      const name = `Sunrich-statement-${r.from}-to-${r.to}.pdf`;
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      } else {
        await shareOrDownload(blob, name, t("khata.stmt.shareText"));
      }
    } catch (e) {
      toast.error(serverMessage(e, t("errors.generic")));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SheetDrawer open={open} onOpenChange={onOpenChange}>
      <div className="px-5 pb-8 pt-2">
        <h2 className="text-lg font-bold">{t("khata.stmt.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("khata.stmt.body")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {RANGES.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={key === k}
              onClick={() => setKey(k)}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                key === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              {t(`khata.stmt.${k}`)}
            </button>
          ))}
        </div>
        {key === "custom" && <DateRange value={custom} onChange={setCustom} />}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={!!busy} onClick={() => void make("download")} className="h-auto min-h-12 rounded-xl font-semibold">
            {busy === "download" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            {t("khata.stmt.download")}
          </Button>
          <Button type="button" disabled={!!busy} onClick={() => void make("share")} className="h-auto min-h-12 rounded-xl font-semibold">
            {busy === "share" ? <Loader2 className="animate-spin" aria-hidden /> : <Share2 aria-hidden />}
            {t("khata.stmt.share")}
          </Button>
        </div>
      </div>
    </SheetDrawer>
  );
}
