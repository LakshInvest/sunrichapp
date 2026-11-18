import type { CatalogProduct } from "@/lib/catalogue";
import type { OrderDto } from "@/lib/orders";
import { istDayOf } from "@/lib/ist";

export type SchemeInfo = { name: string; amount: number; free_qty: number; type?: string; free_value?: number };
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
export function isFreeReplacement(info: SchemeInfo) {
  return info.type === "replacement";
}
/** Include gift/combo products supplied by my_schemes even outside the catalogue. */
export function schemeProducts(s: Scheme, catalogue: CatalogProduct[], lang: string) {
  const rows = new Map<string, { id: string; name: string; imageUrl: string | null; qty?: number }>();
  for (const p of catalogue.filter((p) => schemeCovers(s, p))) {
    rows.set(p.id, { id: p.id, name: p.name[lang as keyof typeof p.name] || p.name.en, imageUrl: p.imageUrl });
  }
  for (const value of [...(s.products ?? []), s.free_product, ...(s.combo_items ?? [])]) {
    if (!value || typeof value !== "object") continue;
    const p = value as Record<string, unknown>;
    const id = p["product_id"] ?? p["id"];
    if (typeof id !== "string") continue;
    const existing = rows.get(id);
    const name = (lang !== "en" ? p[`name_${lang}`] : null) || p["name"] || existing?.name;
    if (typeof name !== "string") continue;
    const image = p["image_url"];
    rows.set(id, { id, name, imageUrl: typeof image === "string" ? image : existing?.imageUrl ?? null, ...(typeof p["qty"] === "number" ? { qty: p["qty"] } : {}) });
  }
  return [...rows.values()];
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
        row.saved += (Number(info.amount) || 0) + (Number(info.free_value) || 0); row.freePacks += Number(info.free_qty) || 0;
        byName.set(info.name, row);
      }
    }
  }
  return { saved, freePacks, schemes: [...byName.values()] };
}