import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, IndianRupee, Loader2, Paperclip, Share2, X } from "lucide-react";
import { BalanceCard } from "@/components/BalanceCard";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SheetDrawer } from "@/components/SheetDrawer";
import { EmptyState, ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/catalogue";
import { dateLabel } from "@/lib/order-format";
import { getMyCustomerId } from "@/lib/orders";
import type { StatementRow } from "@/lib/billing";
import { fetchAppInfo } from "@/lib/app-info";
import { prepareUpload } from "@/lib/image-compress";
import { scrollToFirstError, serverMessage } from "@/lib/form-errors";
import {
  PAY_MODES,
  fetchBalance,
  fetchLedger,
  invoiceIdByNo,
  openingOf,
  rangeFor,
  shareOrDownload,
  statementPdf,
  type Balance,
  type PayMode,
  type RangeKey,
} from "@/lib/ledger";
import { fetchMyPaymentProofs, submitPaymentProof, validUtr, type PaymentProof } from "@/lib/payments";
import { ProofChip } from "@/components/PaymentProofSheet";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: `Balance & statement — Sunrich` },
      { name: "description", content: "Your outstanding balance, credit and statement." },
      { property: "og:title", content: `Balance & statement — Sunrich` },
      { property: "og:description", content: "Your outstanding balance, credit and statement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BalancePage,
});

const RANGES: RangeKey[] = ["thisMonth", "lastMonth", "thisYear", "custom"];
const today = () => new Date().toISOString().slice(0, 10);

function BalancePage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const deva = lang === "en" ? "" : "font-deva";
  const [bal, setBal] = useState<Balance | null>(null);
  const [balErr, setBalErr] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("thisMonth");
  const [custom, setCustom] = useState(() => rangeFor("thisMonth"));
  const period = range === "custom" ? custom : rangeFor(range);
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reported, setReported] = useState<PaymentProof[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [stmtOpen, setStmtOpen] = useState(false);

  const loadBal = useCallback(() => {
    setBalErr(null);
    fetchBalance().then(setBal, (e: Error) => setBalErr(e.message));
    fetchMyPaymentProofs().then(setReported, () => setReported([]));
  }, []);
  useEffect(loadBal, [loadBal]);

  const loadLedger = useCallback(() => {
    setRows(null);
    setErr(null);
    fetchLedger(period.from, period.to).then(setRows, (e: Error) => setErr(serverMessage(e, t("errors.generic"))));
  }, [period.from, period.to]);
  useEffect(loadLedger, [loadLedger]);

  const openRef = async (r: StatementRow) => {
    if (!/invoice/i.test(r.type) || !r.refNo) return;
    const id = await invoiceIdByNo(r.refNo);
    if (id) void navigate({ to: "/invoice/$id", params: { id } });
  };

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-28 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/account" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold">{t("balance.title")}</h1>
        <button
          type="button"
          onClick={() => setStmtOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-secondary"
        >
          <FileText className="h-4 w-4" aria-hidden /> {t("balance.statement")}
        </button>
      </header>

      <div className="space-y-5 px-5 pt-5">
        {balErr ? <ErrorState message={balErr} onRetry={loadBal} /> : <BalanceCard bal={bal} />}

        {reported.length > 0 && (
          <section aria-label={t("balance.reportedTitle")} className="space-y-2">
            {reported.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-dashed border-secondary/50 bg-secondary/5 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {p.amount != null ? formatINR(p.amount) : ""} · {p.method ? t(`balance.mode.${p.method}`, { defaultValue: p.method }) : ""}
                  </span>
                  <ProofChip status={p.status} />
                </div>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {dateLabel(p.paidOn || p.createdAt, lang)}
                  {p.reference ? ` · ${p.reference}` : ""}
                  {p.orderNo ? ` · ${p.orderNo}` : ""}
                </span>
                {p.status === "rejected" && p.rejectReason && (
                  <span className="mt-1 block text-xs font-medium text-destructive">{p.rejectReason}</span>
                )}
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold">{t("balance.ledger")}</h2>
          <div role="group" aria-label={t("balance.period")} className="flex flex-wrap gap-2">
            {RANGES.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={range === k}
                onClick={() => setRange(k)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                  range === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {t(`balance.range.${k}`)}
              </button>
            ))}
          </div>
          {range === "custom" && <DateRange value={custom} onChange={setCustom} />}

          {err ? (
            <ErrorState message={err} onRetry={loadLedger} />
          ) : !rows ? (
            <div className="mt-4 space-y-2" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title={t("payments.noEntriesTitle")} body={t("payments.noEntriesBody")} />
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
              <li className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{t("balance.opening")}</span>
                <span className="font-semibold">{formatINR(openingOf(rows))}</span>
              </li>
              {rows.map((r, i) => {
                const inv = /invoice/i.test(r.type);
                return (
                  <li key={`${r.refNo}-${i}`}>
                    <button
                      type="button"
                      disabled={!inv}
                      onClick={() => void openRef(r)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left disabled:cursor-default"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{entryLabel(r.type, t) || r.details}</span>
                        <span className="block text-xs text-muted-foreground">
                          {dateLabel(r.date, lang)}
                          {r.refNo ? ` · ${r.refNo}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {r.debit > 0 && <span className="block text-sm font-semibold">{formatINR(r.debit)}</span>}
                        {r.credit > 0 && <span className="block text-sm font-semibold text-success">−{formatINR(r.credit)}</span>}
                        <span className="block text-[11px] text-muted-foreground">{formatINR(r.balance)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="flex justify-between bg-primary/5 px-4 py-3">
                <span className="text-sm font-semibold">{t("payments.closing")}</span>
                <span className="font-bold text-primary">{formatINR(rows.at(-1)?.balance ?? 0)}</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          onClick={() => setPayOpen(true)}
          className="mx-auto flex min-h-[52px] w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          <IndianRupee className="h-5 w-5" aria-hidden /> {t("balance.iHavePaid")}
        </button>
      </div>

      <PaidSheet open={payOpen} onOpenChange={setPayOpen} onSent={loadBal} />
      <StatementSheet open={stmtOpen} onOpenChange={setStmtOpen} />
    </main>
  );
}

function entryLabel(type: string, t: (k: string) => string): string {
  const k = type.toLowerCase();
  if (k.includes("opening")) return t("balance.entry.opening");
  if (k.includes("invoice")) return t("balance.entry.invoice");
  if (k.includes("receipt") || k.includes("payment")) return t("balance.entry.payment");
  if (k.includes("credit")) return t("balance.entry.creditNote");
  if (k.includes("debit")) return t("balance.entry.debitNote");
  return "";
}

function DateRange({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <label className="text-xs text-muted-foreground">
        {t("balance.from")}
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground"
        />
      </label>
      <label className="text-xs text-muted-foreground">
        {t("balance.to")}
        <input
          type="date"
          value={value.to}
          min={value.from}
          max={today()}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground"
        />
      </label>
    </div>
  );
}

function StatementSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [r, setR] = useState(() => rangeFor("thisMonth"));
  const [busy, setBusy] = useState<null | "share" | "download">(null);
  const make = async (mode: "share" | "download") => {
    setBusy(mode);
    try {
      const [rows, info, cid] = await Promise.all([fetchLedger(r.from, r.to), fetchAppInfo(), getMyCustomerId()]);
      let customer = "";
      if (cid) {
        const { data } = await supabase.from("customers").select("business_name, contact_name, mobile").eq("id", cid).maybeSingle();
        customer = [data?.business_name, data?.contact_name, data?.mobile].filter(Boolean).join(" · ");
      }
      const blob = await statementPdf({
        company: info.company,
        address: info.address,
        customer,
        from: r.from,
        to: r.to,
        rows,
        labels: {
          title: "Statement of account",
          period: "Period",
          opening: "Opening balance",
          closing: "Closing balance",
          date: "Date",
          ref: "Ref",
          details: "Details",
          debit: "Debit",
          credit: "Credit",
          balance: "Balance",
        },
      });
      const name = `Sunrich-statement-${r.from}-to-${r.to}.pdf`;
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      } else {
        await shareOrDownload(blob, name, t("balance.shareText"));
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
        <h2 className="text-lg font-bold">{t("balance.statement")}</h2>
        <p className="text-sm text-muted-foreground">{t("balance.statementBody")}</p>
        <DateRange value={r} onChange={setR} />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void make("download")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border font-semibold disabled:opacity-60"
          >
            {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {t("balance.download")}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void make("share")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
            {t("balance.shareWhatsapp")}
          </button>
        </div>
      </div>
    </SheetDrawer>
  );
}

function PaidSheet({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (o: boolean) => void; onSent: () => void }) {
  const { t } = useTranslation();
  const offline = useOffline();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PayMode>("upi");
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [errs, setErrs] = useState<Partial<Record<"amount" | "ref" | "date", string>>>({});
  const [sending, setSending] = useState(false);
  const refLabel = useMemo(() => t(`balance.refLabel.${mode}`), [mode, t]);

  const submit = async () => {
    const e: Partial<Record<"amount" | "ref" | "date", string>> = {};
    const amt = Number(amount);
    if (!(amt > 0)) e.amount = t("balance.errAmount");
    if (mode === "upi" || mode === "bank") {
      const r = ref.trim();
      if (r && !validUtr(r)) e.ref = t("success.utrErr");
      else if (!r && !file) e.ref = t("success.errRefOrShot");
    }
    if (!date) e.date = t("balance.errDate");
    setErrs(e);
    if (Object.keys(e).length) {
      scrollToFirstError();
      return;
    }
    setSending(true);
    try {
      let path: string | undefined;
      if (file) {
        const cid = await getMyCustomerId();
        const prep = await prepareUpload(file);
        if (!prep.ok) throw new Error(t(prep.reason === "tooLarge" ? "registration.errFileTooLarge" : "registration.errFileType"));
        path = `${cid}/payments/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "-")}`;
        const { error } = await supabase.storage.from("customer-docs").upload(path, prep.blob, { contentType: prep.mime });
        if (error) throw new Error(error.message);
      }
      await submitPaymentProof({
        amount: amt,
        method: mode,
        reference: ref.trim() || null,
        paidOn: date,
        screenshotPath: path ?? null,
      });
      toast.success(t("balance.paidSent"));
      setAmount("");
      setRef("");
      setFile(null);
      onOpenChange(false);
      onSent();
    } catch (err) {
      toast.error(serverMessage(err, t("errors.generic")));
    } finally {
      setSending(false);
    }
  };

  const field = "mt-1 min-h-12 w-full rounded-xl border bg-card px-3 text-foreground";
  return (
    <SheetDrawer open={open} onOpenChange={onOpenChange}>
      <div className="max-h-[80dvh] overflow-y-auto px-5 pb-8 pt-2">
        <h2 className="text-lg font-bold">{t("balance.iHavePaid")}</h2>
        <p className="text-sm text-muted-foreground">{t("balance.paidBody")}</p>
        <label className="mt-4 block text-sm font-semibold">
          {t("balance.amount")}
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            className={`${field} ${errs.amount ? "border-destructive" : "border-border"}`}
            aria-invalid={!!errs.amount}
          />
          {errs.amount && <span data-field-error className="mt-1 block text-xs text-destructive">{errs.amount}</span>}
        </label>
        <p className="mt-4 text-sm font-semibold">{t("balance.modeLabel")}</p>
        <div role="radiogroup" aria-label={t("balance.modeLabel")} className="mt-1 grid grid-cols-4 gap-2">
          {PAY_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              {t(`balance.mode.${m}`)}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold">
          {refLabel}
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className={`${field} ${errs.ref ? "border-destructive" : "border-border"}`}
            aria-invalid={!!errs.ref}
          />
          {errs.ref && <span data-field-error className="mt-1 block text-xs text-destructive">{errs.ref}</span>}
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("balance.paidOn")}
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className={`${field} ${errs.date ? "border-destructive" : "border-border"}`}
          />
          {errs.date && <span data-field-error className="mt-1 block text-xs text-destructive">{errs.date}</span>}
        </label>
        <div className="mt-4">
          {file ? (
            <div className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3 text-sm">
              <Paperclip className="h-4 w-4" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" aria-label={t("balance.removeFile")} onClick={() => setFile(null)} className="flex h-11 w-11 items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-semibold text-secondary">
              <Paperclip className="h-4 w-4" aria-hidden /> {t("balance.addScreenshot")}
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>
        <button
          type="button"
          disabled={sending || offline}
          onClick={() => void submit()}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("balance.sendPaid")}
        </button>
        {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>
    </SheetDrawer>
  );
}
