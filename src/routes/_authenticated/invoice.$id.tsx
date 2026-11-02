import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Loader2, MessageCircle, Share2 } from "lucide-react";
import { openExternal } from "@/lib/native";
import { serverMessage } from "@/lib/form-errors";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorState, EmptyState, SlowNotice } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { formatINR } from "@/lib/catalogue";
import { fetchInvoice, upiLink, type Invoice } from "@/lib/billing";
import { getInvoiceFirm, type InvoiceFirm } from "@/lib/invoice.functions";
import { amountInWords } from "@/lib/amount-words";

export const Route = createFileRoute("/_authenticated/invoice/$id")({
  head: () => ({
    meta: [
      { title: en.invoice.metaTitle },
      { name: "description", content: en.invoice.metaDescription },
      { property: "og:title", content: en.invoice.metaTitle },
      { property: "og:description", content: en.invoice.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoiceScreen,
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function shareText(inv: Invoice, firm: InvoiceFirm | null): string {
  const lines = [
    firm?.legalName ?? "Sunrich",
    firm?.gstin ? `GSTIN ${firm.gstin}` : "",
    `Invoice ${inv.invoiceNo} · ${fmtDate(inv.invoiceDate)}`,
    "",
    ...inv.lines.map((l) => `${l.description} × ${l.qty} = ${formatINR(l.total)}`),
    "",
    `Total ${formatINR(inv.grandTotal)}`,
    inv.balance > 0 ? `Balance due ${formatINR(inv.balance)}` : "Paid",
    firm?.upiId && inv.balance > 0 ? `UPI ${firm.upiId}` : "",
  ];
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}

function InvoiceScreen() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLang();
  const router = useRouter();
  const firmFn = useServerFn(getInvoiceFirm);
  const deva = lang === "en" ? "" : "font-deva";

  const [inv, setInv] = useState<Invoice | null | undefined>(undefined);
  const [firm, setFirm] = useState<InvoiceFirm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setInv(undefined);
    try {
      const [i, f] = await Promise.all([fetchInvoice(id), firmFn({ data: { invoiceId: id } }).catch(() => null)]);
      setInv(i);
      setFirm(f);
    } catch (e) {
      setError(serverMessage(e, t("errors.generic")));
    }
  }, [id, firmFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const share = async () => {
    if (!inv) return;
    setSharing(true);
    const text = shareText(inv, firm);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Invoice ${inv.invoiceNo}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success(t("invoice.copied"));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(t("invoice.copied"));
        } catch {
          toast.error(t("invoice.shareFailed"));
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const gstTotal = inv ? inv.cgst + inv.sgst + inv.igst : 0;

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-16 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("invoice.title")}</p>
        {inv && (
          <button
            type="button"
            onClick={() => void share()}
            disabled={sharing}
            className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-secondary disabled:opacity-60"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" aria-hidden />}
            {t("invoice.share")}
          </button>
        )}
      </header>

      {inv && (
        <div className="grid grid-cols-2 gap-2 px-4 pt-3 print:hidden">
          <button type="button" onClick={() => window.print()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-semibold">
            <Download className="h-4 w-4 text-secondary" aria-hidden /> {t("invoice.downloadPdf")}
          </button>
          <button
            type="button"
            onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(shareText(inv, firm))}`)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-semibold"
          >
            <MessageCircle className="h-4 w-4 text-secondary" aria-hidden /> {t("invoice.whatsapp")}
          </button>
        </div>
      )}
      <div className="px-4 pt-4">
        {error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : inv === undefined ? (
          <>
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
              <div className="h-48 animate-pulse rounded-2xl bg-muted" />
              <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            </div>
            <SlowNotice loading onRetry={() => void load()} />
          </>
        ) : inv === null ? (
          <EmptyState title={t("invoice.notFound")} body={t("invoice.notFoundBody")} />
        ) : (
          <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="border-b border-border pb-3">
              <p className="text-base font-bold text-primary">{firm?.legalName ?? "Sunrich"}</p>
              {firm?.address && <p className="mt-0.5 text-xs text-muted-foreground">{firm.address}</p>}
              {firm?.gstin && <p className="mt-0.5 text-xs font-semibold text-foreground">GSTIN {firm.gstin}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 border-b border-border py-3 text-xs">
              <div>
                <p className="text-muted-foreground">{t("invoice.no")}</p>
                <p className="font-bold text-foreground break-all">{inv.invoiceNo}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">{t("invoice.date")}</p>
                <p className="font-bold text-foreground">{fmtDate(inv.invoiceDate)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t("invoice.billedTo")}</p>
                <p className="font-semibold text-foreground">{inv.businessName ?? inv.customerName}</p>
                {inv.billingAddress && <p className="text-muted-foreground">{inv.billingAddress}</p>}
                {inv.customerGstin && <p className="text-foreground">GSTIN {inv.customerGstin}</p>}
              </div>
            </div>

            <ul className="divide-y divide-border">
              {inv.lines.map((l) => (
                <li key={l.id} className="py-2.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{l.description}</p>
                    <p className="text-sm font-bold text-foreground">{formatINR(l.total)}</p>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {l.qty} × {formatINR(l.rate)} · {t("invoice.gst")} {l.gstRate}% ({formatINR(l.tax)})
                    {l.hsn ? ` · HSN ${l.hsn}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
              <Row label={t("invoice.taxable")} value={formatINR(inv.taxable)} />
              {inv.isInterstate ? (
                <Row label="IGST" value={formatINR(inv.igst)} />
              ) : (
                <>
                  <Row label="CGST" value={formatINR(inv.cgst)} />
                  <Row label="SGST" value={formatINR(inv.sgst)} />
                </>
              )}
              {gstTotal === 0 && <Row label={t("invoice.gst")} value={formatINR(0)} />}
              {inv.deposit > 0 && <Row label={t("invoice.deposit")} value={formatINR(inv.deposit)} />}
              {inv.roundOff !== 0 && <Row label={t("invoice.roundOff")} value={formatINR(inv.roundOff)} />}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
                <dt>{t("invoice.total")}</dt>
                <dd>{formatINR(inv.grandTotal)}</dd>
              </div>
              {inv.paid > 0 && <Row label={t("invoice.paid")} value={formatINR(inv.paid)} />}
            </dl>
            <p className="mt-2 text-[11px] italic text-muted-foreground">{amountInWords(inv.grandTotal)}</p>

            {inv.balance > 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-primary/5 p-4 text-center">
                <p className="text-sm text-muted-foreground">{t("invoice.balanceDue")}</p>
                <p className="text-2xl font-bold text-primary">{formatINR(inv.balance)}</p>
                {firm?.upiId ? (
                  <>
                    <div className="rounded-xl bg-card p-3">
                      <QRCodeSVG
                        value={upiLink(firm.upiId, firm.payeeName ?? firm.legalName, inv.balance, inv.invoiceNo)}
                        size={168}
                        aria-label={t("invoice.scanToPay")}
                      />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{t("invoice.scanToPay")}</p>
                    <p className="break-all text-xs text-muted-foreground">{firm.upiId}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("invoice.noUpi")}</p>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-bold text-success">
                {t("invoice.fullyPaid")}
              </p>
            )}
          </article>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
