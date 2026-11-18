import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { QuoteResult } from "@/lib/orders";
import { formatINR } from "@/lib/catalogue";
import { isFreeReplacement, type SchemeInfo } from "@/lib/scheme-rules";

export function SchemeLinePrice({ gross, net, discount, free, info = [] }: { gross?: number | undefined; net: number; discount?: number | undefined; free?: boolean | undefined; info?: SchemeInfo[] | undefined }) {
  const { t } = useTranslation();
  return <div className="text-sm"><span className="font-bold text-primary">{free ? `${t("offers.free")} ${formatINR(0)}` : formatINR(net)}</span>{!free && (discount ?? 0) > 0 && gross != null && <del className="ml-2 text-xs text-muted-foreground">{formatINR(gross)}</del>}{info.map((s, i) => <p key={i} className="mt-1 break-words text-xs text-success">{isFreeReplacement(s) ? t("offers.replacement") : t("offers.line", { name: s.name })}{Number(s.amount) > 0 ? ` −${formatINR(s.amount)}` : ""}</p>)}</div>;
}
export function QuoteFreeLines({ quote }: { quote: QuoteResult | null }) {
  const { t } = useTranslation();
  return <ul className="mt-3 divide-y divide-border">{quote?.lines.filter((l) => l.is_free).map((l, i) => <li key={`${l.product_id}-${i}`} className="flex items-start justify-between gap-3 py-3"><span className="min-w-0 break-words text-sm">{l.product_name} · ×{l.qty}<span className="ml-2 rounded-lg bg-success/10 px-2 py-1 text-xs font-bold text-success">{t("offers.free")}</span></span><SchemeLinePrice net={l.line_total} free info={l.scheme_info} /></li>)}</ul>;
}
export function SchemeBill({ quote }: { quote: QuoteResult | null }) {
  const { t } = useTranslation(); if (!quote) return null;
  const rows: [string, number, boolean?][] = [[t("cart.itemTotal"), quote.items_gross ?? quote.items_total], ...(quote.scheme_discount ? [[t("offers.savings"), -quote.scheme_discount, true] as [string, number, boolean]] : []), [t("offers.gst"), quote.tax_total], ...(quote.deposit_total ? [[t("cart.jarDeposit"), quote.deposit_total] as [string, number]] : []), [t("cart.grandTotal"), quote.items_total + quote.deposit_total]];
  return <dl className="mt-4 divide-y divide-border">{rows.map(([name, amount, saving]) => <div key={name} className={`flex justify-between gap-3 py-2 text-sm ${saving ? "font-semibold text-success" : "text-foreground"}`}><dt>{name}</dt><dd className="shrink-0 font-semibold">{amount < 0 ? `−${formatINR(-amount)}` : formatINR(amount)}</dd></div>)}</dl>;
}
export function SchemeHints({ quote, onAdd, disabled }: { quote: QuoteResult | null; onAdd: (id: string, qty: number) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return <div className="mt-3 flex flex-wrap gap-2">{quote?.scheme_hints?.map((h, i) => <div key={i} className="flex max-w-full items-center gap-2 rounded-xl bg-success/10 px-3 py-2"><span className="min-w-0 break-words text-xs text-success">{h.type === "free_qty" ? t("offers.freeHint", { qty: h.need_qty, free: h.get_free_qty, product: h.free_product_name }) : h.type === "slab" ? t("offers.slabHint", { qty: h.need_qty, benefit: h.discount_percent ? t("offers.percent", { percent: h.discount_percent }) : t("offers.amount", { amount: formatINR(h.discount_per_pack ?? 0) }) }) : h.type === "bill_value" ? t("offers.billHint", { amount: formatINR(h.need_value ?? 0), percent: h.discount_percent }) : h.name}</span>{h.product_id && Number(h.need_qty) > 0 && <Button variant="outline" disabled={disabled} className="min-h-11 shrink-0 px-3" onClick={() => onAdd(h.product_id ?? "", Number(h.need_qty))}>+{h.need_qty}</Button>}</div>)}</div>;
}