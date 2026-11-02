import { ownCustomerFilter } from "@/lib/my-customer";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogProduct } from "@/lib/catalogue";

/** Quick tags offered with a rating; stored as these codes. */
export const FEEDBACK_TAGS = ["on_time", "polite", "clean_jars", "late", "damaged", "wrong_items"] as const;

export type OrderFeedback = { orderId: string; rating: number; tags: string[]; comment: string | null };

/** My ratings for the given orders (RLS returns only my own). */
export async function fetchMyFeedback(orderIds: string[]): Promise<Record<string, OrderFeedback>> {
  if (orderIds.length === 0) return {};
  const { data, error } = await supabase
    .from("order_feedback")
    .select("order_id, rating, tags, comment")
    .eq("customer_id", await ownCustomerFilter())
    .in("order_id", orderIds);
  if (error) throw new Error(error.message);
  const out: Record<string, OrderFeedback> = {};
  for (const r of data ?? []) {
    out[r.order_id] = { orderId: r.order_id, rating: Number(r.rating), tags: r.tags ?? [], comment: r.comment ?? null };
  }
  return out;
}

export async function rateMyOrder(orderId: string, rating: number, tags: string[], comment: string): Promise<void> {
  if (rating < 1 || rating > 5) throw new Error("rating");
  const { error } = await supabase.rpc("rate_my_order", {
    p_order_id: orderId,
    p_rating: rating,
    p_tags: tags,
    ...(comment.trim() ? { p_comment: comment.trim() } : {}),
  });
  if (error) throw new Error(error.message);
}

/** Prompts to skip rating are remembered on this device. */
const SKIP_KEY = "sunrich.rateSkipped";
export function skippedRatings(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
export function skipRating(orderId: string): void {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...new Set([...skippedRatings(), orderId])].slice(-50)));
  } catch {
    /* ignore */
  }
}

/**
 * Re-order: keep only lines whose product is still in my catalogue and
 * orderable; clamp to the product's min/max. Returns what to add and how
 * many lines were skipped.
 */
export function planReorder(
  lines: { productId: string; qty: number }[],
  products: Pick<CatalogProduct, "id" | "canOrder" | "minOrderQty" | "maxOrderQty" | "price">[],
): { add: { productId: string; qty: number }[]; skipped: number } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const add: { productId: string; qty: number }[] = [];
  let skipped = 0;
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p || !p.canOrder || p.price == null) {
      skipped++;
      continue;
    }
    let q = Math.max(l.qty, p.minOrderQty || 1);
    if (p.maxOrderQty) q = Math.min(q, p.maxOrderQty);
    add.push({ productId: p.id, qty: q });
  }
  return { add, skipped };
}
