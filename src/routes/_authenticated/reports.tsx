import { schemeBenefits } from "@/lib/scheme-rules";
import { Suspense, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Share2, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { SheetDrawer } from "@/components/SheetDrawer";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { fetchReportPurchases, fetchReportPayments, reportPdf } from "@/lib/reports";
import { reportMonths, purchaseSummary, paymentSummary } from "@/lib/report-rules";
import { formatINR } from "@/lib/catalogue";
import { istMonth, IST_TZ } from "@/lib/ist";
import { deliverStatement } from "@/lib/statement-delivery";
import { uploadStatement } from "@/lib/statement.functions";
import { serverMessage } from "@/lib/form-errors";
import en from "@/locales/en.json";

const purchasesQuery = queryOptions({ queryKey: ["reports", "purchases"], queryFn: fetchReportPurchases });
const paymentQuery = (month: string) => queryOptions({ queryKey: ["reports", "payments", month], queryFn: () => fetchReportPayments(month) });
export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Sunrich" }, { name: "description", content: en.reports.description }, { property: "og:title", content: "Reports — Sunrich" }, { property: "og:description", content: en.reports.description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(purchasesQuery), context.queryClient.ensureQueryData(paymentQuery(istMonth()))]),
  component: Reports,
});
type Tab = "monthly" | "products" | "payments" | "benefits";
function Reports() {
  const { t } = useTranslation(); const { lang } = useLang(); const navigate = useNavigate();
  const [month, setMonth] = useState(istMonth); const [tab, setTab] = useState<Tab>("monthly");
  const months = reportMonths();
  const monthName = (m: string) => new Intl.DateTimeFormat(`${lang}-IN`, { month: "long", year: "numeric", timeZone: IST_TZ }).format(new Date(`${m}-01T12:00:00+05:30`));
  return <PageShell className={`pb-8 ${lang === "en" ? "" : "font-deva"}`}>
    <header className="flex items-center gap-2 px-3 pt-3"><Button variant="ghost" size="icon" aria-label={t("registration.back")} onClick={() => navigate({ to: "/account" })}><ArrowLeft /></Button><h1 className="text-xl font-bold text-primary">{t("reports.title")}</h1></header>
    <div className="px-5"><label className="mt-4 block text-sm font-semibold">{t("reports.month")}<select value={month} onChange={(e) => setMonth(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-input bg-card px-3">{months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}</select></label>
    <div role="tablist" className="my-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">{(["monthly", "products", "payments", "benefits"] as const).map((k) => <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "secondary" : "ghost"} onClick={() => setTab(k)} className="h-auto min-h-12 whitespace-normal px-1 text-xs">{t(k === "benefits" ? "offers.benefits" : `reports.${k}`)}</Button>)}</div>
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}><ReportBody key={month} month={month} tab={tab} monthName={monthName} /></Suspense></div>
  </PageShell>;
}
function ReportBody({ month, tab, monthName }: { month: string; tab: Tab; monthName: (m: string) => string }) {
  const { t } = useTranslation(); const navigate = useNavigate(); const offline = useOffline(); const upload = useServerFn(uploadStatement);
  const { data } = useSuspenseQuery(purchasesQuery); const { data: payment } = useSuspenseQuery(paymentQuery(month));
  const benefits = schemeBenefits(data.orders, month);
  const summary = purchaseSummary(data.orders, month, data.paid); const pay = paymentSummary(payment.rows);
  const [product, setProduct] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const metrics = tab === "monthly" ? [["orders", String(summary.orders)], ["packs", String(summary.packs)], ["value", formatINR(summary.value)], ["paid", formatINR(summary.paid)], ["due", formatINR(summary.due)]] : [["opening", formatINR(pay.opening)], ["bills", formatINR(pay.bills)], ["paid", formatINR(pay.paid)], ["credits", formatINR(pay.credits)], ["debits", formatINR(pay.debits)], ["closing", formatINR(pay.closing)]];
  const chart = reportMonths(new Date(`${month}-15T12:00:00+05:30`), 6).reverse().map((m) => ({ month: m, value: purchaseSummary(data.orders, m, data.paid).value }));
  const max = Math.max(1, ...chart.map((c) => c.value));
  const make = async (mode: "download" | "share") => {
    if (busy || offline) return; setBusy(mode); setError(null);
    try {
      const lines = tab === "benefits" ? [`${t("offers.saved")}: ${formatINR(benefits.saved)}`, `${t("offers.freePacks")}: ${benefits.freePacks}`, ...benefits.schemes.map((s) => `${s.name}: ${formatINR(s.saved)} · ${t("offers.freePacks")}: ${s.freePacks}`)] : tab === "products" ? summary.products.map((p) => `${p.name} · ${t("reports.packs")}: ${p.packs} · ${formatINR(p.value)} · ${p.percent.toFixed(1)}%`) : metrics.map(([k, v]) => `${t(`reports.${k}`)}: ${v}`);
      if (tab === "payments") for (const [k, v] of Object.entries(payment.modes)) lines.push(`${t(`balance.mode.${k}`)}: ${formatINR(v)}`);
      if (tab === "monthly") for (const c of chart) lines.push(`${monthName(c.month)}: ${formatINR(c.value)}`);
      const title = `${t("brand")} · ${t(tab === "benefits" ? "offers.benefits" : `reports.${tab}`)}`;
      await deliverStatement(await reportPdf(title, monthName(month), lines), `Sunrich-report-${tab}-${month}.pdf`, `${title} · ${monthName(month)}`, mode, upload);
    } catch (e) { setError(serverMessage(e, t("khata.stmt.failed"))); } finally { setBusy(null); }
  };
  return <>
    {tab === "benefits" ? <><dl className="divide-y divide-border"><div className="flex justify-between gap-3 py-3"><dt>{t("offers.saved")}</dt><dd className="font-bold text-success">{formatINR(benefits.saved)}</dd></div><div className="flex justify-between gap-3 py-3"><dt>{t("offers.freePacks")}</dt><dd className="font-bold">{benefits.freePacks}</dd></div></dl><ul className="mt-4 divide-y divide-border">{benefits.schemes.map((s) => <li key={s.name} className="py-3"><p className="break-words text-sm font-semibold">{s.name}</p><p className="mt-1 text-sm text-success">{formatINR(s.saved)} · {t("offers.freePacks")}: {s.freePacks}</p></li>)}</ul>{!benefits.schemes.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("offers.empty")}</p>}</> : tab === "products" ? <ul className="divide-y divide-border">{summary.products.map((p) => <li key={p.id}><Button variant="ghost" onClick={() => setProduct(p.id)} className="h-auto min-h-20 w-full justify-between gap-3 whitespace-normal px-0 text-left"><span className="min-w-0 flex-1 break-words"><span className="block font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{t("reports.packs")}: {p.packs} · {p.percent.toFixed(1)}%</span></span><span className="shrink-0 font-bold text-primary">{formatINR(p.value)}</span></Button></li>)}</ul> : <dl className="divide-y divide-border">{metrics.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-3"><dt className="text-sm text-muted-foreground">{t(`reports.${k}`)}</dt><dd className="text-right font-bold text-primary">{v}</dd></div>)}</dl>}
    {tab === "monthly" && <section className="mt-6"><h2 className="text-sm font-bold">{t("reports.sixMonths")}</h2><div className="mt-3 space-y-3">{chart.map((c) => <div key={c.month}><div className="flex justify-between gap-2 text-xs"><span>{monthName(c.month)}</span><span>{formatINR(c.value)}</span></div><progress max={max} value={c.value} aria-label={monthName(c.month)} className="report-bar mt-1 h-2 w-full" /></div>)}</div></section>}
    {tab === "payments" && <dl className="mt-4 divide-y divide-border">{Object.entries(payment.modes).map(([k, v]) => <div key={k} className="flex justify-between py-3 text-sm"><dt>{t(`balance.mode.${k}`)}</dt><dd className="font-semibold">{formatINR(v)}</dd></div>)}</dl>}
    {summary.orders === 0 && tab !== "payments" && tab !== "benefits" && <p className="py-8 text-center text-sm text-muted-foreground">{t("reports.empty")}</p>}
    <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="outline" disabled={!!busy || offline} onClick={() => void make("download")} className="h-auto min-h-12 whitespace-normal">{busy === "download" ? <Loader2 className="animate-spin" /> : <Download />}{t("khata.stmt.download")}</Button><Button disabled={!!busy || offline} onClick={() => void make("share")} className="h-auto min-h-12 whitespace-normal">{busy === "share" ? <Loader2 className="animate-spin" /> : <Share2 />}{t("reports.share")}</Button></div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}{offline && <p className="mt-3 text-sm text-muted-foreground">{t("offline.hint")}</p>}
    <SheetDrawer open={!!product} onOpenChange={(open) => { if (!open) setProduct(null); }}><div className="px-5 pb-8"><h2 className="break-words text-lg font-bold">{summary.products.find((p) => p.id === product)?.name}</h2><p className="mt-1 text-sm text-muted-foreground">{monthName(month)}</p><ul className="mt-3 divide-y divide-border">{summary.products.find((p) => p.id === product)?.orders.map((o) => <li key={o.id}><Button variant="ghost" className="h-auto min-h-14 w-full justify-between whitespace-normal px-0 text-left" onClick={() => navigate({ to: "/track/$id", params: { id: o.id } })}><span>{o.orderNo}</span><span>{formatINR(o.grandTotal)}</span></Button></li>)}</ul></div></SheetDrawer>
  </>;
}