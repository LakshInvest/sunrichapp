import { useTranslation } from "react-i18next";
import type { QuoteResult } from "@/lib/orders";
import { quoteParts } from "@/lib/report-rules";
import { formatINR } from "@/lib/catalogue";
export function OrderSplitPreview({ quote }: { quote: QuoteResult | null }) {
  const { t } = useTranslation(); const parts = quoteParts(quote);
  if (parts.length < 2) return null;
  return <section className="mt-4 border-y border-secondary/30 bg-secondary/5 py-3" aria-label={t("reports.split", { count: parts.length })}><h2 className="text-sm font-bold text-primary">{t("reports.split", { count: parts.length })}</h2><ul className="mt-2 space-y-2">{parts.map((p) => {
    const line = quote?.lines.find((l) => (l.firm_id ?? null) === p.firmId && (l.fulfiller_customer_id || null) === p.fulfillerId);
    const named = line as (QuoteResult["lines"][number] & { fulfiller_name?: string; distributor_name?: string; firm_name?: string }) | undefined;
    return <li key={p.key} className="flex justify-between gap-2 text-xs"><span className="min-w-0 break-words">{p.fulfillerId ? t("reports.distributor", { name: named?.fulfiller_name ?? named?.distributor_name ?? t("reports.localDistributor") }) : named?.firm_name ?? t("brand")} · {t("checkout2.items", { count: p.items })}</span><span className="shrink-0 font-semibold">{formatINR(p.total)}</span></li>;
  })}</ul></section>;
}