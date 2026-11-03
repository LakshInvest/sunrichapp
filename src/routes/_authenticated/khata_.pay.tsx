import { toast } from "sonner";
import { openUpi } from "@/lib/upi";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { istToday } from "@/lib/ist";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Banknote, CheckCircle2, FileCheck2, Landmark, Loader2, Paperclip, Smartphone, X } from "lucide-react";
import en from "@/locales/en.json";
import { PageShell } from "@/components/PageShell";
import { CopyRow } from "@/components/PaymentProofSheet";
import { ErrorState } from "@/components/catalog/states";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { formatINR } from "@/lib/catalogue";
import { scrollToFirstError, serverMessage } from "@/lib/form-errors";
import { prepareUpload } from "@/lib/image-compress";
import { validUtr } from "@/lib/payments";
import { getKhataPayInfo, type KhataPayInfo } from "@/lib/payments.functions";
import {
  fetchKhataSummary,
  payChoices,
  submitMyPayment,
  uploadPaymentFile,
  validPayAmount,
  type KhataSummary,
  type PaymentInput,
} from "@/lib/khata";

export const Route = createFileRoute("/_authenticated/khata_/pay")({
  head: () => ({
    meta: [
      { title: `${en.khata.pay.title} — Sunrich` },
      { name: "description", content: en.khata.metaDescription },
      { property: "og:title", content: `${en.khata.pay.title} — Sunrich` },
      { property: "og:description", content: en.khata.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayPage,
});

type Mode = PaymentInput["method"];
type Choice = "full" | "overdue" | "other";
type CashTo = "office" | "salesman" | "driver";
const MODES: { m: Mode; icon: typeof Smartphone }[] = [
  { m: "upi", icon: Smartphone },
  { m: "cash", icon: Banknote },
  { m: "bank", icon: Landmark },
  { m: "cheque", icon: FileCheck2 },
];
const today = () => istToday();

function PayPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const loadInfo = useServerFn(getKhataPayInfo);
  const deva = lang === "en" ? "" : "font-deva";

  const [sum, setSum] = useState<KhataSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<KhataPayInfo | null | undefined>(undefined);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [choice, setChoice] = useState<Choice>("full");
  const [other, setOther] = useState("");
  const [mode, setMode] = useState<Mode>("upi");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cashTo, setCashTo] = useState<CashTo | null>(null);
  const [cashName, setCashName] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState(today);
  const [paidOn, setPaidOn] = useState(today);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const load = () => {
    setErr(null);
    fetchKhataSummary().then(
      (s) => {
        setSum(s);
        if (!(s.balance > 0)) setChoice("other");
      },
      (e) => setErr(serverMessage(e, t("errors.generic"))),
    );
    loadInfo().then(setInfo, () => setInfo(null));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const choices = sum ? payChoices(sum) : { full: null, overdue: null };
  const amount = useMemo(() => {
    if (choice === "full") return choices.full ?? 0;
    if (choice === "overdue") return choices.overdue ?? 0;
    return Number(other) || 0;
  }, [choice, choices.full, choices.overdue, other]);
  const extra = sum && amount > Math.max(0, sum.balance) ? amount - Math.max(0, sum.balance) : 0;

  const next = () => {
    if (!validPayAmount(amount)) {
      setErrs({ amount: t("khata.pay.enterAmount") });
      scrollToFirstError();
      return;
    }
    setErrs({});
    setStep(2);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    const r = ref.trim();
    if (paidOn > today()) e["paidOn"] = t("khata.pay.futureDate");
    if (mode === "upi") {
      if (r && !validUtr(r)) e["ref"] = t("khata.pay.utrErr");
      else if (!r && !file) e["ref"] = t("khata.pay.needUtrOrShot");
    }
    if (mode === "bank" && !r && !file) e["ref"] = t("khata.pay.needBankRef");
    if (mode === "cash") {
      if (!cashTo) e["cashTo"] = t("khata.pay.needCashTo");
      if (!cashName.trim()) e["cashName"] = t("khata.pay.needName");
    }
    if (mode === "cheque" && !chequeNo.trim()) e["chequeNo"] = t("khata.pay.needChequeNo");
    setErrs(e);
    if (Object.keys(e).length) {
      scrollToFirstError();
      return;
    }
    setSending(true);
    try {
      let path: string | null = null;
      if (file && mode !== "cash") {
        const prep = await prepareUpload(file);
        if (!prep.ok) throw new Error(t(prep.reason === "tooLarge" ? "registration.errFileTooLarge" : "registration.errFileType"));
        path = await uploadPaymentFile(prep.blob, file.name, prep.mime);
      }
      await submitMyPayment({
        amount,
        method: mode,
        reference: mode === "cash" || mode === "cheque" ? null : r || null,
        paidOn,
        screenshotPath: path,
        cashPaidTo: mode === "cash" ? cashTo : null,
        cashPaidToName: mode === "cash" ? cashName : null,
        chequeNo: mode === "cheque" ? chequeNo : null,
        chequeBank: mode === "cheque" ? chequeBank : null,
        chequeDate: mode === "cheque" ? chequeDate : null,
      });
      setStep(3);
    } catch (x) {
      setErrs({ submit: serverMessage(x, t("errors.generic")) });
    } finally {
      setSending(false);
    }
  };

  const field = (bad?: string) =>
    `mt-1 min-h-12 w-full rounded-xl border bg-card px-3 text-base text-foreground ${bad ? "border-destructive" : "border-border"}`;
  const err_ = (k: string) =>
    errs[k] ? (
      <span data-field-error className="mt-1 block text-xs font-medium text-destructive">
        {errs[k]}
      </span>
    ) : null;
  const filePick = (label: string) =>
    file ? (
      <div className="mt-2 flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3 text-sm">
        <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <button type="button" aria-label={t("balance.removeFile")} onClick={() => setFile(null)} className="flex h-11 w-11 items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <label className="mt-2 flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-semibold text-secondary">
        <Paperclip className="h-4 w-4" aria-hidden /> {label}
        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
    );

  if (step === 3) {
    return (
      <PageShell className={`flex flex-col items-center justify-center px-6 text-center ${deva}`}>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3" data-testid="pay-success">
          <CheckCircle2 className="h-16 w-16 text-success" aria-hidden />
          <h1 className="text-2xl font-bold text-primary">{t("khata.pay.successTitle")}</h1>
          <p className="text-3xl font-extrabold">{formatINR(amount)}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t("khata.pay.successBody")}</p>
          <Button type="button" onClick={() => navigate({ to: "/khata", replace: true })} className="mt-4 h-auto min-h-12 w-full max-w-xs rounded-xl text-base font-semibold">
            {t("khata.pay.backToKhata")}
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className={`pb-[calc(8rem+env(safe-area-inset-bottom))] ${deva}`}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => (step === 2 ? setStep(1) : navigate({ to: "/khata" }))}
          aria-label={t("khata.pay.back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold">{t("khata.pay.title")}</h1>
        <span className="shrink-0 pr-3 text-xs font-semibold text-muted-foreground">{step}/2</span>
      </header>

      {err ? (
        <ErrorState message={err} onRetry={load} />
      ) : !sum ? (
        <div className="space-y-3 px-5 pt-5" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : step === 1 ? (
        <div className="space-y-3 px-5 pt-5">
          <h2 className="text-lg font-bold">{t("khata.pay.step1")}</h2>
          <div role="radiogroup" aria-label={t("khata.pay.step1")} className="space-y-2">
            {choices.full !== null && (
              <AmountOption active={choice === "full"} onClick={() => setChoice("full")} label={t("khata.pay.full")} value={formatINR(choices.full)} />
            )}
            {choices.overdue !== null && (
              <AmountOption active={choice === "overdue"} onClick={() => setChoice("overdue")} label={t("khata.pay.onlyOverdue")} value={formatINR(choices.overdue)} />
            )}
            <AmountOption active={choice === "other"} onClick={() => setChoice("other")} label={t("khata.pay.other")} value="" />
          </div>
          {choice === "other" && (
            <label className="block text-sm font-semibold">
              {t("balance.amount")}
              <input
                inputMode="decimal"
                autoFocus
                value={other}
                onChange={(e) => setOther(e.target.value.replace(/[^\d.]/g, ""))}
                className={field(errs["amount"])}
                aria-invalid={!!errs["amount"]}
                data-testid="pay-other"
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">{t("khata.pay.otherHint")}</span>
            </label>
          )}
          {err_("amount")}
          {extra > 0 && (
            <p className="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">{t("khata.pay.advanceNote", { amount: formatINR(extra) })}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 px-5 pt-5">
          <p className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold">
            {t("balance.amount")}: <span className="text-primary">{formatINR(amount)}</span>
          </p>
          <h2 className="text-lg font-bold">{t("khata.pay.step2")}</h2>
          <div role="radiogroup" aria-label={t("khata.pay.step2")} className="grid grid-cols-2 gap-2">
            {MODES.map(({ m, icon: Icon }) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setMode(m);
                  setErrs({});
                }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
                  mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {t(`balance.mode.${m}`)}
              </button>
            ))}
          </div>

          {mode === "upi" && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              {info === undefined ? (
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
              ) : info?.upiId ? (
                <>
                  {info.qrUrl && (
                    <div className="flex flex-col items-center gap-1">
                      <img src={info.qrUrl} alt={t("khata.pay.scanQr")} className="h-44 w-44 rounded-xl border border-border bg-white object-contain p-2" />
                      <span className="text-xs text-muted-foreground">{t("khata.pay.scanQr")}</span>
                    </div>
                  )}
                  <CopyRow label={t("khata.pay.upiId")} value={info.upiId} />
                  <button
                    type="button"
                    onClick={() =>
                      void openUpi({ pa: info.upiId!, pn: info.payeeName ?? info.firmName, amount, orderNo: "Khata", note: "Khata payment" }).then((res) => {
                        if (res.kind === "noApp") toast.error(t("upi.noApp"));
                        else if (res.kind === "success" && res.response.utr) setRef(res.response.utr);
                        else if (res.kind === "failed") toast.error(t("upi.failedTitle"));
                      })
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary text-sm font-semibold text-primary"
                  >
                    <Smartphone className="h-4 w-4" aria-hidden /> {t("khata.pay.payWithUpi")}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("khata.pay.noUpi")}</p>
              )}
              <div>
                <p className="text-sm font-semibold">{t("khata.pay.screenshot")}</p>
                {filePick(t("khata.pay.addScreenshot"))}
              </div>
              <label className="block text-sm font-semibold">
                {t("khata.pay.utr")}
                <input
                  inputMode="numeric"
                  value={ref}
                  onChange={(e) => setRef(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className={field(errs["ref"])}
                  aria-invalid={!!errs["ref"]}
                  data-testid="pay-utr"
                />
              </label>
              {err_("ref")}
            </section>
          )}

          {mode === "cash" && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">{t("khata.pay.cashTo")}</p>
              <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {(["office", "salesman", "driver"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={cashTo === c}
                    onClick={() => setCashTo(c)}
                    className={`min-h-11 rounded-xl border px-1 text-xs font-semibold ${
                      cashTo === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                    }`}
                  >
                    {t(`khata.pay.cash${c[0]!.toUpperCase()}${c.slice(1)}`)}
                  </button>
                ))}
              </div>
              {err_("cashTo")}
              <label className="block text-sm font-semibold">
                {t("khata.pay.cashName")}
                <input value={cashName} onChange={(e) => setCashName(e.target.value)} className={field(errs["cashName"])} />
              </label>
              {err_("cashName")}
            </section>
          )}

          {mode === "bank" && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              {info?.bank && (
                <div>
                  <p className="text-sm font-semibold">{t("khata.pay.bankDetails")}</p>
                  <CopyRow label={info.bank.accountName} value={info.bank.accountNumber} />
                  <CopyRow label="IFSC" value={info.bank.ifsc} />
                  <p className="mt-1 text-xs text-muted-foreground">{info.bank.bankName}</p>
                </div>
              )}
              <label className="block text-sm font-semibold">
                {t("khata.pay.bankRef")}
                <input value={ref} onChange={(e) => setRef(e.target.value.slice(0, 40))} className={field(errs["ref"])} />
              </label>
              <div>
                <p className="text-sm font-semibold">{t("khata.pay.bankProof")}</p>
                {filePick(t("khata.pay.addScreenshot"))}
              </div>
              {err_("ref")}
            </section>
          )}

          {mode === "cheque" && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <label className="block text-sm font-semibold">
                {t("khata.pay.chequeNo")}
                <input inputMode="numeric" value={chequeNo} onChange={(e) => setChequeNo(e.target.value.slice(0, 12))} className={field(errs["chequeNo"])} />
              </label>
              {err_("chequeNo")}
              <label className="block text-sm font-semibold">
                {t("khata.pay.chequeBank")}
                <input value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} className={field()} />
              </label>
              <label className="block text-sm font-semibold">
                {t("khata.pay.chequeDate")}
                <input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} className={field()} />
              </label>
              <div>
                <p className="text-sm font-semibold">{t("khata.pay.chequePhoto")}</p>
                {filePick(t("khata.pay.chequePhoto"))}
              </div>
            </section>
          )}

          <label className="block text-sm font-semibold">
            {t("khata.pay.paidOn")}
            <input type="date" value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value)} className={field(errs["paidOn"])} />
          </label>
          {err_("paidOn")}
          {errs["submit"] && (
            <p role="alert" data-field-error className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {errs["submit"]}
            </p>
          )}
        </div>
      )}

      {sum && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" data-kb-bar>
          <Button
            type="button"
            disabled={sending || offline}
            onClick={() => (step === 1 ? next() : void submit())}
            className="mx-auto flex h-auto min-h-[52px] w-full max-w-md rounded-xl text-base font-semibold"
            data-testid="pay-main"
          >
            {sending && <Loader2 className="animate-spin" aria-hidden />}
            {step === 1 ? t("khata.pay.next") : `${t("khata.pay.submit")} · ${formatINR(amount)}`}
          </Button>
          {offline && <p className="mt-1 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        </div>
      )}
    </PageShell>
  );
}

function AmountOption({ active, onClick, label, value }: { active: boolean; onClick: () => void; label: string; value: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 text-left ${
        active ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <span className="flex items-center gap-3">
        <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${active ? "border-[6px] border-primary" : "border-muted-foreground/40"}`} aria-hidden />
        <span className="text-sm font-semibold">{label}</span>
      </span>
      {value && <span className="text-base font-bold text-primary">{value}</span>}
    </button>
  );
}
