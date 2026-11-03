import { readSwr, writeSwr } from "@/lib/swr-cache";
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
  /** Rate for the customer's default delivery mode (delivered = pickup + charge per pack). */
  price: number | null;
  pickupPrice: number | null;
  deliveredPrice: number | null;
  defaultMode: "sunrich" | "pickup";
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
  displaySeconds?: number;
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

/** Pick the rate for the default mode; unpriced (price null) stays null. */
export function modePrices(r: Record<string, unknown>): { price: number | null; pickupPrice: number | null; deliveredPrice: number | null; defaultMode: "sunrich" | "pickup" } {
  const n = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const base = n(r['price']);
  const defaultMode = r['default_delivery_mode'] === "pickup" ? "pickup" : "sunrich";
  if (base === null) return { price: null, pickupPrice: null, deliveredPrice: null, defaultMode };
  const pickupPrice = n(r['pickup_price']) ?? base;
  const deliveredPrice = n(r['delivered_price']) ?? pickupPrice + (n(r['delivery_charge_per_pack']) ?? 0);
  return { price: defaultMode === "pickup" ? pickupPrice : deliveredPrice, pickupPrice, deliveredPrice, defaultMode };
}

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
    ...modePrices(r),
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

/** Cached copy younger than this is served without a network round-trip. */
export const CATALOGUE_FRESH_MS = 5 * 60_000;
let inflight: Promise<CatalogData> | null = null;

/**
 * Stale-while-revalidate: a cache under 5 min old is returned as-is; pass
 * `{ force: true }` (pull-to-refresh, retry) to always hit the network.
 */
export async function fetchCatalogue(opts: { force?: boolean } = {}): Promise<CatalogData> {
  if (!opts.force) {
    const cached = readCatalogueCache();
    if (cached && Date.now() - cached.fetchedAt < CATALOGUE_FRESH_MS) return cached;
  }
  inflight ??= loadCatalogue().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Command Center order: category sort_order, then product sort_order.
 * Categories without any in-app product are dropped.
 */
export function arrangeCatalogue<T extends { categories: CatalogCategory[]; products: CatalogProduct[] }>(d: T): T {
  const cats = [...d.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const rank = new Map(cats.map((c, i) => [c.code, i]));
  const products = [...d.products].sort(
    (a, b) =>
      (rank.get(a.categoryCode ?? "") ?? 9999) - (rank.get(b.categoryCode ?? "") ?? 9999) || a.sortOrder - b.sortOrder,
  );
  const used = new Set(products.map((p) => p.categoryCode));
  return { ...d, categories: cats.filter((c) => used.has(c.code)), products };
}

/** Extra Home values returned by get_home() (Khata, default address, chats awaiting the customer). */
export type HomeExtras = { khata: Record<string, unknown> | null; defaultAddress: Record<string, unknown> | null; awaitingReply: number };
// Saved copy from the last open, so Home's Khata strip and address show instantly on a cold open.
let homeExtras: HomeExtras | null = readSwr<HomeExtras>("homeExtras");
const extrasListeners = new Set<(x: HomeExtras) => void>();
function setHomeExtras(x: HomeExtras) {
  homeExtras = x;
  writeSwr("homeExtras", x);
  extrasListeners.forEach((fn) => fn(x));
}
/** Calls fn with the current extras (if any) and every later get_home() result. */
export function onHomeExtras(fn: (x: HomeExtras) => void): () => void {
  extrasListeners.add(fn);
  if (homeExtras) fn(homeExtras);
  return () => {
    extrasListeners.delete(fn);
  };
}
/** Last get_home() extras, or null before the first load. */
export function getHomeExtras(): HomeExtras | null {
  return homeExtras;
}

async function loadCatalogue(): Promise<CatalogData> {
  const now = Date.now();
  // One round trip: get_home() returns hero, sections, categories, banners
  // and this customer's priced catalogue. The customer type (banner
  // targeting) is read alongside it, not after.
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  const [{ data: home, error: homeErr }, typeRes] = await Promise.all([
    supabase.rpc("get_home"),
    uid
      ? supabase.from("user_profiles").select("customers(customer_type_id)").eq("id", uid).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (homeErr) throw new Error(homeErr.message);
  const h = (home ?? {}) as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(h[k]) ? (h[k] as Record<string, unknown>[]) : []);
  const catalogue = arr("products") as unknown as RawProduct[];
  const categories = arr("categories");
  const heroRows = (h["hero"] as Record<string, unknown> | null) ?? null;
  const sectionRows = arr("sections") as unknown as { key: string }[];
  const custRel = (typeRes.data as { customers?: { customer_type_id?: string | null } | null } | null)?.customers;
  const customerTypeId: string | null = custRel?.customer_type_id ?? null;
  setHomeExtras({
    khata: (h["khata"] as Record<string, unknown> | null) ?? null,
    defaultAddress: (h["default_address"] as Record<string, unknown> | null) ?? null,
    awaitingReply: Number(h["awaiting_reply"] ?? 0),
  });

  const banners: CatalogBanner[] = (arr("banners") as Record<string, unknown>[])
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
      displaySeconds: Math.min(30, Math.max(2, num(b["display_seconds"]) ?? 5)),
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

  const data: CatalogData = arrangeCatalogue({
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
  });
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
