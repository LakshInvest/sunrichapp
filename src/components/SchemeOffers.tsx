import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Gift, Percent, Layers, Package, BadgeIndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetDrawer } from "@/components/SheetDrawer";
import { DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { SmartImage } from "@/components/SmartImage";
import { useSchemes } from "@/lib/schemes";
import { schemeCovers, schemeText, type Scheme } from "@/lib/scheme-rules";
import { loc, formatINR, type CatalogProduct } from "@/lib/catalogue";
import { useLang } from "@/hooks/use-lang";
import { indDate } from "@/lib/order-format";
import { serverMessage } from "@/lib/form-errors";

function useRule() {
  const { t } = useTranslation();
  return (s: Scheme) => {
    if (s.scheme_type === "free_qty") return t("offers.buyFree", { buy: s.buy_qty, free: s.free_qty });
    if (s.scheme_type === "percent_off") return t("offers.percent", { percent: s.discount_percent });
    if (s.scheme_type === "amount_off") return t("offers.amount", { amount: formatINR(s.discount_amount ?? 0) });
    if (s.scheme_type === "bill_value") return t("offers.billRule", { amount: formatINR(s.min_value ?? 0), benefit: s.discount_percent ? t("offers.percent", { percent: s.discount_percent }) : t("offers.amount", { amount: formatINR(s.discount_amount ?? 0) }) });
    return t(s.scheme_type === "combo" ? "offers.combo" : "offers.slab");
  };
}
const icons: Record<string, typeof Gift> = { free_qty: Gift, percent_off: Percent, amount_off: BadgeIndianRupee, slab: Layers, combo: Package, bill_value: BadgeIndianRupee };
export function SchemeBadge({ product }: { product: CatalogProduct }) {
  const { data = [] } = useSchemes(); const rule = useRule();
  const s = data.find((s) => schemeCovers(s, product));
  return s ? <span className="mt-1 block w-fit max-w-full rounded-lg bg-success/10 px-2 py-1 text-[10px] font-bold text-success">{rule(s)}</span> : null;
}
export function ProductSchemes({ product }: { product: CatalogProduct }) {
  const { data = [], error } = useSchemes(); const { lang } = useLang(); const rule = useRule(); const { t } = useTranslation();
  return <>{error && <p role="alert" className="mt-3 text-xs text-destructive">{serverMessage(error, t("offers.failed"))}</p>}{data.filter((s) => schemeCovers(s, product)).map((s, i) => <div key={s.id ?? s.scheme_id ?? i} className="mt-4 border-y border-success/20 bg-success/5 py-3"><p className="text-sm font-bold text-success">{schemeText(s, lang)} · {rule(s)}</p><p className="mt-1 text-sm text-foreground">{schemeText(s, lang, "description")}</p></div>)}</>;
}
export function SchemeOffers({ products }: { products: CatalogProduct[] }) {
  const { data = [], error, refetch } = useSchemes(); const { t } = useTranslation(); const { lang } = useLang(); const rule = useRule(); const navigate = useNavigate();
  const [selected, setSelected] = useState<Scheme | null>(null);
  if (error) return <div className="px-3"><p role="alert" className="text-xs text-destructive">{serverMessage(error, t("offers.failed"))}</p><Button variant="ghost" onClick={() => void refetch()}>{t("common.retry")}</Button></div>;
  if (!data.length) return null;
  return <section className="px-3"><h2 className="mb-2 text-base font-bold">{t("offers.title")}</h2><div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">{data.map((s, i) => {
    const Icon = icons[s.scheme_type] ?? Gift;
    return <Button key={s.id ?? s.scheme_id ?? i} variant="ghost" className="block h-auto w-64 shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card p-0 text-left whitespace-normal" onClick={() => setSelected(s)}>{s.image_url ? <SmartImage src={s.image_url} alt="" width={360} className="aspect-[2/1] w-full object-cover" /> : <div className="flex aspect-[2/1] items-center justify-center bg-secondary/10"><Icon className="!h-10 !w-10 text-secondary" /></div>}<div className="p-3"><p className="break-words text-sm font-bold">{schemeText(s, lang)}</p><p className="mt-1 text-xs font-semibold text-success">{rule(s)}</p>{s.ends_on && <p className="mt-1 text-xs text-muted-foreground">{t("offers.valid", { date: indDate(s.ends_on, lang) })}</p>}</div></Button>;
  })}</div><SheetDrawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>{selected && <div className="overflow-y-auto px-5 pb-8"><DrawerTitle className="mt-3 break-words text-lg">{schemeText(selected, lang)}</DrawerTitle><DrawerDescription className="mt-2 whitespace-pre-wrap">{schemeText(selected, lang, "description") || rule(selected)}</DrawerDescription>{selected.image_url && <SmartImage src={selected.image_url} alt="" className="mt-3 aspect-[2/1] w-full rounded-xl object-cover" />}<p className="mt-3 font-semibold text-success">{rule(selected)}</p>{selected.min_qty ? <p className="mt-2 text-sm">{t("offers.minimum", { qty: selected.min_qty })}</p> : null}{selected.ends_on && <p className="mt-2 text-xs text-muted-foreground">{t("offers.valid", { date: indDate(selected.ends_on, lang) })}</p>}{selected.slabs?.map((r, i) => <p key={i} className="mt-2 text-sm">{t("offers.slabRule", { qty: r["min_qty"], benefit: r["discount_percent"] ? t("offers.percent", { percent: r["discount_percent"] }) : t("offers.amount", { amount: formatINR(Number(r["discount_amount"] ?? r["discount_per_pack"] ?? 0)) }) })}</p>)}<ul className="mt-4 divide-y divide-border">{products.filter((p) => schemeCovers(selected, p) || selected.combo_items?.some((r) => r["product_id"] === p.id) || (typeof selected.free_product === "string" ? selected.free_product === p.id : selected.free_product && typeof selected.free_product === "object" && (selected.free_product as Record<string, unknown>)["id"] === p.id)).map((p) => <li key={p.id}><Button variant="ghost" className="h-auto min-h-16 w-full justify-start whitespace-normal px-0 text-left" onClick={() => { setSelected(null); void navigate({ to: "/product/$id", params: { id: p.id } }); }}><SmartImage src={p.imageUrl} width={48} alt="" className="h-12 w-12 shrink-0 object-contain" /><span className="min-w-0 break-words">{loc(p.name, lang)}{selected.combo_items?.filter((r) => r["product_id"] === p.id).map((r, i) => <span key={i}> · ×{String(r["qty"] ?? "")}</span>)}</span></Button></li>)}</ul></div>}</SheetDrawer></section>;
}