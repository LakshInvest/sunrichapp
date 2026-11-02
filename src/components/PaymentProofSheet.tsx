import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Clock, Copy, Loader2, Paperclip, Send, XCircle } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { prepareUpload } from "@/lib/image-compress";
import { scrollToFirstError, serverMessage } from "@/lib/form-errors";
import { getMyCustomerId } from "@/lib/orders";
import { submitPaymentProof, validUtr } from "@/lib/payments";
import { istToday } from "@/lib/ist";

/** The order (or balance) a proof sheet is filled in for. */
export type ProofTarget = {
  orderId?: string | null;
  orderNo?: string | null;
  amount: number;
  method: "upi" | "bank";
};

const today = () => istToday();

/** "I've paid": UTR (12 digits) and/or a payment screenshot → submit_payment_proof. */
export function PaymentProofSheet({
  open,
  onOpenChange,
  target,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: ProofTarget | null;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [errs, setErrs] = useState<Partial<Record<"ref" | "date", string>>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setRef("");
      setDate(today());
      setFile(null);
      setErrs({});
    }
  }, [open]);

  if (!target) return null;

  const submit = async () => {
    const e: Partial<Record<"ref" | "date", string>> = {};
    const r = ref.trim();
    if (r && !validUtr(r)) e.ref = t("success.utrErr");
    if (!r && !file) e.ref = t("success.errRefOrShot");
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
        // customer-docs policy allows customer uploads only under <id>/queries/
        path = `${cid}/queries/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "-")}`;
        const { error } = await supabaseUpload(path, prep.blob, prep.mime);
        if (error) throw new Error(error.message);
      }
      await submitPaymentProof({
        amount: target.amount,
        method: target.method,
        reference: r || null,
        paidOn: date,
        screenshotPath: path ?? null,
        orderId: target.orderId ?? null,
      });
      toast.success(t("success.proofSent"));
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(serverMessage(err, t("errors.generic")));
    } finally {
      setSending(false);
    }
  };

  const field = "mt-1 min-h-12 w-full rounded-xl border bg-card px-3 text-foreground";
  return (
    <SheetDrawer open={open} onOpenChange={onOpenChange}>
      <div className="max-h-[85dvh] overflow-y-auto px-5 pb-8 pt-2">
        <h2 className="text-lg font-bold text-foreground">{t("success.proofTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("success.proofBody")}</p>
        {target.orderNo && (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm font-semibold text-foreground">
            {target.orderNo} · ₹{target.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        )}
        <label className="mt-4 block text-sm font-semibold">
          {t(`success.utrLabel.${target.method}`)}
          <input
            inputMode="numeric"
            value={ref}
            onChange={(e) => setRef(e.target.value.replace(/\D/g, "").slice(0, 12))}
            className={`${field} ${errs.ref ? "border-destructive" : "border-border"}`}
            aria-invalid={!!errs.ref}
          />
          {errs.ref && <span data-field-error className="mt-1 block text-xs text-destructive">{errs.ref}</span>}
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("success.paidOnLabel")}
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
              <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" aria-label={t("success.removeShot")} onClick={() => setFile(null)} className="flex h-11 w-11 items-center justify-center">
                <XIcon />
              </button>
            </div>
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-semibold text-secondary">
              <Paperclip className="h-4 w-4" aria-hidden /> {t("success.addShot")}
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>
        <button
          type="button"
          disabled={sending}
          onClick={() => void submit()}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {t("success.proofSubmit")}
        </button>
      </div>
    </SheetDrawer>
  );
}

async function supabaseUpload(path: string, blob: Blob, mime: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase.storage.from("customer-docs").upload(path, blob, { contentType: mime });
}

function XIcon() {
  return <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

/** Status line for an order's payment: verified / rejected / checking. */
export function PaymentStatusNote({
  proof,
  hold,
  onSendAgain,
}: {
  proof: { status: string; rejectReason: string | null } | null;
  hold?: boolean | undefined;
  onSendAgain?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  if (proof?.status === "verified") {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/15 px-3 py-2.5 text-sm font-semibold text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden /> {t("success.paymentReceived")}
      </p>
    );
  }
  if (proof?.status === "rejected") {
    return (
      <div className="mt-3 rounded-xl bg-destructive/10 px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden /> {t("success.notAccepted")}
          {proof.rejectReason ? ` — ${proof.rejectReason}` : ""}
        </p>
        {onSendAgain && (
          <button
            type="button"
            onClick={onSendAgain}
            className="mt-2 min-h-11 rounded-xl border border-destructive/40 px-4 text-sm font-semibold text-destructive"
          >
            {t("success.sendAgain")}
          </button>
        )}
      </div>
    );
  }
  if (proof?.status === "pending" || hold) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-accent/15 px-3 py-2.5 text-sm font-medium text-accent-foreground">
        <Clock className="h-4 w-4 shrink-0" aria-hidden /> {t("success.checking")}
      </p>
    );
  }
  return null;
}

/** Small chip for payment-proof status lists. */
export function ProofChip({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls =
    status === "verified"
      ? "bg-secondary/15 text-primary"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-accent/15 text-accent-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {status === "verified" ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : status === "rejected" ? <XCircle className="h-3 w-3" aria-hidden /> : <Clock className="h-3 w-3" aria-hidden />}
      {t(`payments.proof.${status}`, { defaultValue: status })}
    </span>
  );
}

/** Copy-to-clipboard row for bank details. */
export function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("success.copied"));
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-none">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`${t("success.copy")} ${label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-secondary active:scale-95"
      >
        <Copy className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
