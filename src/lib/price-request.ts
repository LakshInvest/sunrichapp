import i18n from "@/lib/i18n";
import { loc, type CatalogProduct } from "@/lib/catalogue";

/**
 * "Price on request" flow. A product without a price for this customer cannot
 * be ordered; tapping the card's button opens the queries chat pre-filled as a
 * price request. The subject is canonical English so the same product always
 * matches the same query regardless of the UI language.
 */
const PREFIX = "Price request: ";

/** Canonical, stable subject: "Price request: <name> (<pack>)", max 120 chars. */
export function priceRequestSubject(p: CatalogProduct): string {
  const name = p.name.en || p.code;
  const pack = p.packLabel?.en ?? "";
  const base = pack ? `${PREFIX}${name} (${pack})` : `${PREFIX}${name}`;
  return base.slice(0, 120);
}

/** Extracts the product label from a price-request subject, or null. */
export function parsePriceRequestSubject(subject: string): { label: string } | null {
  if (!subject.startsWith(PREFIX)) return null;
  const label = subject.slice(PREFIX.length).trim();
  return label ? { label } : null;
}

/** True when a query subject marks a price request (used for tags in lists). */
export function isPriceRequestSubject(subject: string): boolean {
  return parsePriceRequestSubject(subject) !== null;
}

/** Encoded product ref passed to the ask form (id, name, pack). */
export function encodeProductChip(p: CatalogProduct): string {
  return encodeURIComponent(
    JSON.stringify({ id: p.id, name: p.name.en || p.code, pack: p.packLabel?.en ?? "" }),
  );
}

export function decodeProductChip(v: string | undefined): { id: string; name: string; pack: string } | null {
  if (!v) return null;
  try {
    const o = JSON.parse(decodeURIComponent(v)) as Record<string, unknown>;
    const id = String(o["id"] ?? "");
    if (!id) return null;
    return { id, name: String(o["name"] ?? ""), pack: String(o["pack"] ?? "") };
  } catch {
    return null;
  }
}

/** The customer's open (awaiting-Sunrich or awaiting-customer) price-request chat for this product. */
export async function findOpenPriceRequestQuery(subject: string): Promise<string | null> {
  const { data, error } = await supabaseListOpen();
  if (error || !data) return null;
  const hit = (data as { id: string; subject: string }[]).find((q) => q.subject === subject);
  return hit?.id ?? null;
}

async function supabaseListOpen() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase
    .from("customer_queries")
    .select("id, subject, status")
    .in("status", ["answered", "open"])
    .order("created_at", { ascending: false })
    .limit(50);
}

type NavigateLike = (opts: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  replace?: boolean;
}) => Promise<unknown> | unknown;

/**
 * Opens the price-request chat for a product: the existing open chat when one
 * exists, otherwise the ask form pre-filled (never auto-sent).
 */
export async function openPriceRequestChat(
  product: CatalogProduct,
  lang: string,
  navigate: NavigateLike,
): Promise<void> {
  const subject = priceRequestSubject(product);
  const existing = await findOpenPriceRequestQuery(subject);
  if (existing) {
    void navigate({ to: "/queries/$id", params: { id: existing } });
    return;
  }
  const message = i18n.t("queries.priceRequestMessage", {
    name: loc(product.name, lang),
    pack: loc(product.packLabel, lang),
  });
  void navigate({
    to: "/queries/ask",
    search: { topic: undefined, order: undefined, subject, message, product: encodeProductChip(product) },
  });
}
