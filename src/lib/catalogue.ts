import { supabase } from "@/integrations/supabase/client";

/**
 * Live catalogue data layer. Everything on Home, Order, product detail and
 * Cart comes from the database through RLS-safe reads:
 * - my_catalogue()  — per-customer catalogue with this customer's price
 * - product_categories / app_hero / app_banners / app_home_sections
 * - toggle_favourite()
 * The last successful snapshot is cached in localStorage so the app keeps
 * working read-only while offline.
 */

export type Loc = { en: string; hi: string | null; mr: string | null };

/** Reads a localized DB field in the chosen language, falling back to English. */
export function loc(field: Loc | null | undefined, lang: string): string {
  if (!field) return "";
  if (lang === "hi") return field.hi || field.en;
  if (lang === "mr") return field.mr || field.en;
  return field.en;
}

export type CatalogProduct = {
  id: string;
  code: string;
  categoryId: string | null;
  categoryCode: string | null;
  brandName: string | null;
  name: Loc;
  description: Loc | null;
  packLabel: Loc | null;
  sellUnit: string | null;
  unitsPerSellUnit: number | null;
  volumeMl: number | null;
  imageUrl: string | null;
  images: string[];
  mrp: number | null;
  price: number | null;
  depositAmount: number | null;
  gstRate: number | null;
  minOrderQty: number;
  maxOrderQty: number | null;
  bulkThresholdQty: number | null;
  isReturnable: boolean;
  isPopular: boolean;
  isFavourite: boolean;
  sortOrder: number;
  canOrder: boolean;
};

export type CatalogCategory = {
  id: string;
  code: string;
  name: Loc;
  iconKey: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type CatalogBanner = {
  id: string;
  imageUrl: string | null;
  title: Loc;
  subtitle: Loc | null;
  tag: Loc | null;
  linkType: string;
  linkValue: string | null;
  sortOrder: number;
};

export type CatalogHero = {
  greeting: Loc | null;
  deliveryLine: Loc | null;
  backgroundImageUrl: string | null;
  productImageUrl: string | null;
};

export type CatalogData = {
  fetchedAt: number;
  sections: string[];
  hero: CatalogHero | null;
  categories: CatalogCategory[];
  banners: CatalogBanner[];
  products: CatalogProduct[];
};

export type CatalogLoadResult =
  | { ok: true; data: CatalogData }
  | { ok: false; cached: CatalogData | null; message: string };

const CACHE_KEY = "sunrich.catalogue.v1";

type RawProduct = Record<string, unknown>;

function asLoc(v: unknown): Loc {
  const o = (v ?? {}) as Record<string, unknown>;
  return { en: String(o["en"] ?? ""), hi: (o["hi"] as string) ?? null, mr: (o["mr"] as string) ?? null };
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapProduct(r: RawProduct): CatalogProduct {
  return {
    id: String(r['id']),
    code: String(r['code'] ?? ""),
    categoryId: (r['category_id'] as string) ?? null,
    categoryCode: (r['category_code'] as string) ?? null,
    brandName: (r['brand_name'] as string) ?? null,
    name: asLoc({ ['en']: r['name'], ['hi']: r['name_hi'], ['mr']: r['name_mr'] }),
    description: r['description'] ? asLoc({ ['en']: r['description'], ['hi']: r['description_hi'], ['mr']: r['description_mr'] }) : null,
    packLabel: r['pack_label'] ? asLoc({ ['en']: r['pack_label'], ['hi']: r['pack_label_hi'], ['mr']: r['pack_label_mr'] }) : null,
    sellUnit: (r['sell_unit'] as string) ?? null,
    unitsPerSellUnit: num(r['units_per_sell_unit']),
    volumeMl: num(r['volume_ml']),
    imageUrl: (r['image_url'] as string) ?? null,
    images: Array.isArray(r['images']) ? (r['images'] as string[]).filter((u): u is string => typeof u === "string") : [],
    mrp: num(r['mrp']),
    price: num(r['price']),
    depositAmount: num(r['deposit_amount']),
    gstRate: num(r['gst_rate']),
    minOrderQty: Math.max(1, num(r['min_order_qty']) ?? 1),
    maxOrderQty: num(r['max_order_qty']),
    bulkThresholdQty: num(r['bulk_threshold_qty']),
    isReturnable: Boolean(r['is_returnable']),
    isPopular: Boolean(r['is_popular']),
    isFavourite: Boolean(r['is_favourite']),
    sortOrder: num(r['sort_order']) ?? 0,
    canOrder: Boolean(r['can_order']),
  };
}

export async function fetchCatalogue(): Promise<CatalogData> {
  const now = Date.now();
  const [
    { data: catalogue, error: catErr },
    { data: categories, error: catgErr },
    { data: heroRows, error: heroErr },
    { data: sectionRows, error: secErr },
  ] = await Promise.all([
    supabase.rpc("my_catalogue"),
    supabase
      .from("product_categories")
      .select("id, code, name, name_hi, name_mr, icon_key, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("app_hero").select("*").limit(1).maybeSingle(),
    supabase.from("app_home_sections").select("key, sort_order").eq("is_active", true).order("sort_order"),
  ]);
  if (catErr) throw new Error(catErr.message);
  if (catgErr) throw new Error(catgErr.message);
  if (heroErr) throw new Error(heroErr.message);
  if (secErr) throw new Error(secErr.message);

  // Customer type for banner targeting (best effort — banners simply target all on failure).
  let customerTypeId: string | null = null;
  try {
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("customer_id")
        .eq("id", user.user.id)
        .maybeSingle();
      if (prof?.customer_id) {
        const { data: c } = await supabase
          .from("customers")
          .select("customer_type_id")
          .eq("id", prof.customer_id)
          .maybeSingle();
        customerTypeId = c?.customer_type_id ?? null;
      }
    }
  } catch {
    /* banners show for everyone */
  }

  const banners: CatalogBanner[] = ((await supabase
    .from("app_banners")
    .select("id, image_url, title, title_hi, title_mr, subtitle, subtitle_hi, subtitle_mr, tag, tag_hi, tag_mr, link_type, link_value, customer_type_ids, start_at, end_at, sort_order")
    .eq("is_active", true)
    .order("sort_order")).data ?? [])
    .filter((b: Record<string, unknown>) => {
      const start = b["start_at"] ? new Date(String(b["start_at"])).getTime() : null;
      const end = b["end_at"] ? new Date(String(b["end_at"])).getTime() : null;
      if (start !== null && start > now) return false;
      if (end !== null && end < now) return false;
      const ids = Array.isArray(b["customer_type_ids"]) ? (b["customer_type_ids"] as string[]) : null;
      if (ids && ids.length > 0 && (!customerTypeId || !ids.includes(customerTypeId))) return false;
      return true;
    })
    .map((b: Record<string, unknown>) => ({
      id: String(b["id"]),
      imageUrl: (b["image_url"] as string) ?? null,
      title: asLoc({ ["en"]: b["title"], ["hi"]: b["title_hi"], ["mr"]: b["title_mr"] }),
      subtitle: b["subtitle"] ? asLoc({ ["en"]: b["subtitle"], ["hi"]: b["subtitle_hi"], ["mr"]: b["subtitle_mr"] }) : null,
      tag: b["tag"] ? asLoc({ ["en"]: b["tag"], ["hi"]: b["tag_hi"], ["mr"]: b["tag_mr"] }) : null,
      linkType: String(b["link_type"] ?? "none"),
      linkValue: (b["link_value"] as string) ?? null,
      sortOrder: num(b["sort_order"]) ?? 0,
    }));

  const heroRow = heroRows as Record<string, unknown> | null;
  const hero = heroRow
    ? {
        greeting: heroRow["greeting"]
          ? asLoc({ ["en"]: heroRow["greeting"], ["hi"]: heroRow["greeting_hi"], ["mr"]: heroRow["greeting_mr"] })
          : null,
        deliveryLine: heroRow["delivery_line"]
          ? asLoc({ ["en"]: heroRow["delivery_line"], ["hi"]: heroRow["delivery_line_hi"], ["mr"]: heroRow["delivery_line_mr"] })
          : null,
        backgroundImageUrl: (heroRow["background_image_url"] as string) ?? null,
        productImageUrl: (heroRow["product_image_url"] as string) ?? null,
      }
    : null;

  const data: CatalogData = {
    fetchedAt: now,
    sections: (sectionRows ?? []).map((s: { key: string }) => s.key),
    hero,
    categories: (categories ?? []).map((c: Record<string, unknown>) => ({
      id: String(c["id"]),
      code: String(c["code"]),
      name: asLoc({ ["en"]: c["name"], ["hi"]: c["name_hi"], ["mr"]: c["name_mr"] }),
      iconKey: String(c["icon_key"] ?? "grid"),
      imageUrl: (c["image_url"] as string) ?? null,
      sortOrder: num(c["sort_order"]) ?? 0,
    })),
    banners,
    products: (catalogue ?? []).map((p: RawProduct) => mapProduct(p)),
  };
  writeCatalogueCache(data);
  return data;
}

export function readCatalogueCache(): CatalogData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogData;
    return parsed && Array.isArray(parsed.products) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCatalogueCache(data: CatalogData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full — cache is best effort */
  }
}

/** Toggle the favourite heart. Returns the new state. */
export async function toggleFavourite(productId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_favourite", { p_product_id: productId });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/* ---------- price formatting & rules (Task 7) ---------- */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹ with Indian digit grouping, e.g. ₹1,234.50 */
export function formatINR(value: number | null | undefined): string {
  return `₹${inr.format(value ?? 0)}`;
}

/** Amount saved vs MRP, or null when there is nothing to show. */
export function priceSave(p: CatalogProduct): number | null {
  if (p.price === null || p.mrp === null) return null;
  const save = p.mrp - p.price;
  return save > 0 ? save : null;
}

/** Cart price snapshots so a changed rate can be flagged ("Price updated"). */
const CART_PRICES_KEY = "sunrich.cartPrices";

export function loadCartPrices(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CART_PRICES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveCartPrice(id: string, price: number): void {
  try {
    const map = loadCartPrices();
    map[id] = price;
    localStorage.setItem(CART_PRICES_KEY, JSON.stringify(map));
  } catch {
    /* best effort */
  }
}

export function forgetCartPrice(id: string): void {
  try {
    const map = loadCartPrices();
    delete map[id];
    localStorage.setItem(CART_PRICES_KEY, JSON.stringify(map));
  } catch {
    /* best effort */
  }
}

/* ---------- recent searches (Task 9) ---------- */

const RECENTS_KEY = "sunrich.searches";

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  const next = [q, ...loadRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* best effort */
  }
}

/* ---------- search matching (Task 9) ---------- */

/** Search across name (all languages), code and pack label (all languages). */
export function matchesSearch(p: CatalogProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    p.name.en,
    p.name.hi ?? "",
    p.name.mr ?? "",
    p.code,
    p.packLabel?.en ?? "",
    p.packLabel?.hi ?? "",
    p.packLabel?.mr ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/** Clamp a requested quantity to the product's min/max rules. */
export function clampQty(p: CatalogProduct, qty: number): number {
  const min = Math.max(1, p.minOrderQty || 1);
  let out = Math.max(qty, 0);
  if (out > 0 && out < min) out = min;
  if (p.maxOrderQty != null) out = Math.min(out, p.maxOrderQty);
  return out;
}
