import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Banknote, Building2, Camera, Check, Landmark, Loader2, Smartphone, X } from "lucide-react";
import { formatINR } from "@/lib/catalogue";
import { CopyRow } from "@/components/PaymentProofSheet";
import { openUpi, upiLink } from "@/lib/upi";
import { prepareUpload } from "@/lib/image-compress";
import { isNative, pickPhoto } from "@/lib/native";
import { getMyCustomerId } from "@/lib/my-customer";
import { supabase } from "@/integrations/supabase/client";
import { serverMessage } from "@/lib/form-errors";
import { fetchPayOptions, paymentReady, submitOrderPayment, type PayMethod, type PayOptions } from "@/lib/quote-flow";

const ICON: Record<PayMethod, typeof Smartphone> = { upi: Smartphone, bank: Landmark, cash: Banknote, credit: Building2 };

/** Payment after the customer approves the quote (Prompt-70 §4). */
export function PaySection({ orderId, orderNo, offline, onDone, onPhase }: { orderId: string; orderNo: string; offline: boolean; onDone: () => void; onPhase?: (p: "mode" | "pay") => void }) {
  const { t } = useTranslation();
  // One action per page: choose the mode, then pay (Prompt-77 §4).
  const [phase, setPhaseState] = useState<"mode" | "pay">("mode");
  const setPhase = (p: "mode" | "pay") => { setPhaseState(p); onPhase?.(p); window.scrollTo({ top: 0 }); };
  const [opts, setOpts] = useState<PayOptions | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [ref, setRef] = useState("");
  const [cashTo, setCashTo] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Android: system photo picker (no storage permission). Web: file input.
  const pickScreenshot = async () => {
    if (!isNative()) return fileInput.current?.click();
    const f = await pickPhoto("photos");
    if (f) setFile(f);
  };

  useEffect(() => {
    let live = true;
    fetchPayOptions(orderId).then((o) => {
      if (!live) return;
      setOpts(o);
      if (o.methods.length === 1) { setMethod(o.methods[0] ?? null); setPhaseState("pay"); onPhase?.("pay"); }
    }, (e) => live && setLoadErr(serverMessage(e, t("common.loadError"))));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, t]);

  if (loadErr) return <p role="alert" className="rounded-xl bg-card p-4 text-sm text-destructive shadow-sm">{loadErr}</p>;
  if (!opts) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  const to = opts.pay_to ?? {};
  const payee = to.payee || to.firm || "";
  const upiId = to.upi_id ?? "";
  const params = { pa: upiId, pn: payee, amount: opts.amount, orderNo };
  const ready = paymentReady(method, ref, opts.proof_required, cashTo);

  const launch = async () => {
    const out = await openUpi(params, undefined, orderId);
    if (out.kind === "success" && out.response.utr) setRef(out.response.utr);
  };

  const submit = async () => {
    if (!method || !ready || sending || offline) return;
    setSending(true); setErr(null);
    try {
      let path: string | null = null;
      if (file && (method === "upi" || method === "bank")) {
        const prepared = await prepareUpload(file);
        if (!prepared.ok) throw new Error(t(prepared.reason === "tooLarge" ? "registration.errFileTooLarge" : "registration.errFileType"));
        const cid = await getMyCustomerId();
        path = `${cid}/payments/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "-")}`;
        const { error } = await supabase.storage.from("customer-docs").upload(path, prepared.blob, { contentType: prepared.mime });
        if (error) throw error;
      }
      await submitOrderPayment(orderId, method, method === "upi" || method === "bank" ? ref.trim() || null : null, path, method === "cash" ? cashTo : null);
      onDone();
    } catch (e) {
      setErr(serverMessage(e, t("quote.payError")));
    } finally { setSending(false); }
  };

  return (
    <section className="rounded-xl bg-card p-4 shadow-sm" id="pay-now">
      <p className="text-xs font-semibold text-muted-foreground">{t("quote.payTitle")}</p>
      <p className="text-3xl font-bold text-primary">{formatINR(opts.amount)}</p>
      {opts.required_method && <p className="mt-1 text-xs font-semibold text-accent-foreground">{t("quote.requiredMethod", { mode: t(`quote.method.${opts.required_method}`, { defaultValue: opts.required_method }) })}</p>}
      {phase === "mode" ? (
      <>
      <p className="mt-3 text-sm font-bold text-foreground">{t("quote.chooseMode")}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {opts.methods.map((m) => {
          const Icon = ICON[m];
          return (
            <button key={m} type="button" aria-pressed={method === m} onClick={() => { setMethod(m); setErr(null); }} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-background p-2 text-sm font-bold text-foreground ${method === m ? "border-secondary" : "border-transparent"}`}>
              <Icon className="h-6 w-6 text-secondary" />{t(`quote.method.${m}`)}
            </button>
          );
        })}
      </div>
      <button type="button" disabled={!method} onClick={() => setPhase("pay")} className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50">{t("quote.modeContinue")}</button>
      </>
      ) : (
      <>
      {method && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
          <span className="text-sm font-bold text-foreground">{t(`quote.method.${method}`)}</span>
          {opts.methods.length > 1 && <button type="button" onClick={() => setPhase("mode")} className="min-h-11 px-2 text-sm font-bold text-primary">{t("quote.changeMode")}</button>}
        </div>
      )}

      {method === "upi" && (
        <div className="mt-4">
          {upiId ? (
            <>
              <button type="button" onClick={() => void launch()} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground"><Smartphone className="h-4 w-4" />{t("quote.payByUpi")}</button>
              <div className="mt-3 flex flex-col items-center">
                <div className="rounded-xl bg-qr p-3"><QRCodeSVG value={upiLink(params)} size={170} level="M" aria-label={t("pay.qrAlt")} /></div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{upiId}</p>
              </div>
            </>
          ) : <p className="rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">{t("success.infoMissing")}</p>}
        </div>
      )}
      {method === "bank" && (
        <div className="mt-4 rounded-xl bg-muted px-3">
          <CopyRow label={t("success.accountName")} value={to.account_name ?? payee} />
          <CopyRow label={t("success.bankName")} value={to.bank ?? ""} />
          <CopyRow label={t("success.accountNo")} value={to.account_number ?? ""} />
          <CopyRow label={t("success.ifsc")} value={to.ifsc ?? ""} />
          {to.branch && <CopyRow label={t("quote.branch")} value={to.branch} />}
        </div>
      )}
      {(method === "upi" || method === "bank") && (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold text-muted-foreground">{t("quote.utr")}
            <input value={ref} onChange={(e) => setRef(e.target.value.replace(/[^\w-]/g, "").slice(0, 30))} inputMode="text" autoCapitalize="characters" className="mt-1 min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base font-semibold text-foreground" />
          </label>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {file ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm"><Check className="h-4 w-4 text-success" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" aria-label={t("cart.remove")} onClick={() => setFile(null)}><X className="h-4 w-4" /></button></div>
          ) : (
            <button type="button" onClick={() => void pickScreenshot()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground"><Camera className="h-4 w-4" />{t("quote.screenshot")}</button>
          )}
        </div>
      )}
      {method === "cash" && (
        <div className="mt-4">
          <p className="text-sm font-bold text-foreground">{t("quote.cashTo")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">{["office", "salesman"].map((w) => <button key={w} type="button" aria-pressed={cashTo === w} onClick={() => setCashTo(w)} className={`min-h-12 rounded-xl border-2 bg-background text-sm font-bold ${cashTo === w ? "border-secondary" : "border-border"}`}>{t(`quote.cash.${w}`)}</button>)}</div>
        </div>
      )}
      {method === "credit" && <p className="mt-4 rounded-xl bg-muted px-3 py-3 text-sm font-semibold text-foreground">{t("quote.creditConfirm")}</p>}

      {err && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{err}</p>}
      {method && (
        <button type="button" disabled={!ready || sending || offline} onClick={() => void submit()} className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50">
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}{t(method === "credit" ? "quote.creditYes" : "quote.sendPayment")}
        </button>
      )}
      </>
      )}
    </section>
  );
}
