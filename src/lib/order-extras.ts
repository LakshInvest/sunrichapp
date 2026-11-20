/** `my_order_extras`: priced lines, discounts, totals, bills and dispatch parts for one order. */
import { supabase } from "@/integrations/supabase/client";

export type ExtraLine = { line_id: string; product_id: string | null; name: string; pack_label: string | null; qty: number; rate: number | null; total: number | null; is_free: boolean; discount: number | null };
export type ExtraDiscount = { kind: string | null; value: number | null; amount: number; note: string | null };
export type ExtraBill = { invoice_id: string; invoice_no: string | null; invoice_date: string | null; total: number | null; plant: string | null; pdf_path: string | null; einv: boolean | null; ewb_no: string | null; gate_out_at: string | null };
export type ExtraPart = { order_id: string; plant: string | null; status: string; vehicle_no: string | null; driver_name: string | null; driver_mobile: string | null; gate_out_at: string | null; delivered_at: string | null; pod_photo_path: string | null };
export type OrderExtras = { lines: ExtraLine[]; discounts: ExtraDiscount[]; totals: { subtotal: number | null; discount: number | null; grand_total: number | null } | null; bills: ExtraBill[]; parts: ExtraPart[] };

export async function fetchOrderExtras(orderId: string): Promise<OrderExtras> {
  const { data, error } = await supabase.rpc("my_order_extras", { p_order_id: orderId });
  if (error) throw error;
  const d = (data ?? {}) as Partial<OrderExtras>;
  return { lines: d.lines ?? [], discounts: d.discounts ?? [], totals: d.totals ?? null, bills: d.bills ?? [], parts: d.parts ?? [] };
}

/** "Discount 5% · Festival offer" — percent kinds show the %, flat kinds show nothing extra. */
export function discountLabel(d: ExtraDiscount, word: string): string {
  const pct = d.kind && /pct|percent/i.test(d.kind) && d.value ? ` ${d.value}%` : "";
  return `${word}${pct}${d.note ? ` · ${d.note}` : ""}`;
}

/** Signed 10-minute link for a bill PDF in the `bills` bucket. */
export async function billPdfUrl(path: string): Promise<string | null> {
  const clean = path.replace(/^bills\//, "");
  const { data, error } = await supabase.storage.from("bills").createSignedUrl(clean, 600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
