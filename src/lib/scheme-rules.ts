import type { CatalogProduct } from "@/lib/catalogue";
import type { OrderDto } from "@/lib/orders";
import { istDayOf } from "@/lib/ist";

export type SchemeInfo = { name: string; amount: number; free_qty: number };
export type Scheme = {
  id?: string; scheme_id?: string; name: string; name_hi?: string | null; name_mr?: string | null;
  description?: string | null; description_hi?: string | null; description_mr?: string | null;
  image_url?: string | null; scheme_type: string; ends_on?: string | null;
  buy_qty?: number; free_qty?: number; free_product?: unknown; discount_percent?: number; discount_amount?: number;
  min_qty?: number; min_value?: number; products?: unknown[]; categories?: unknown[]; slabs?: Record<string, unknown>[]; combo_items?: Record<string, unknown>[];
};
export type SchemeHint = { type: string; name: string; product_id?: string; product_name?: string; need_qty?: number; get_free_qty?: number; free_product_name?: string; slab_min_qty?: number; discount_per_pack?: number; discount_percent?: number; need_value?: number };
export function schemeText(s: Scheme, lang: string, key: "name" | "description" = "name") {
  return (lang === "hi" ? s[`${key}_hi`] : lang === "mr" ? s[`${key}_mr`] : null) || s[key] || "";
}
function matches(values: unknown[] | undefined, id: string | null, code: string | null, key: string) {
  return !!values?.some((v) => {
    if (typeof v === "string") return v === id || v === code;
    if (!v || typeof v !== "object") return false;
    const row = v as Record<string, unknown>;
    return [row["id"], row[key], row["code"], row[key.replace("_id", "_code")]].some((x) => typeof x === "string" && (x === id || x === code));
  });
}
export function schemeCovers(s: Scheme, p: Pick<CatalogProduct, "id" | "code" | "categoryId" | "categoryCode">) {
  return matches(s.products, p.id, p.code, "product_id") || matches(s.categories, p.categoryId, p.categoryCode, "category_id");
}
export function schemeBenefits(orders: OrderDto[], month: string) {
  let saved = 0; let freePacks = 0;
  const byName = new Map<string, { name: string; saved: number; freePacks: number }>();
  for (const o of orders) {
    if (["cancelled", "rejected"].includes(o.status) || istDayOf(o.createdAt)?.slice(0, 7) !== month) continue;
    for (const l of o.lines) {
      saved += l.discountAmount ?? 0;
      if (l.isFree) freePacks += l.qty;
      for (const info of l.schemeInfo ?? []) {
        const row = byName.get(info.name) ?? { name: info.name, saved: 0, freePacks: 0 };
        row.saved += Number(info.amount) || 0; row.freePacks += Number(info.free_qty) || 0;
        byName.set(info.name, row);
      }
    }
  }
  return { saved, freePacks, schemes: [...byName.values()] };
}