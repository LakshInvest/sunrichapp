/** Proof of delivery and per-line delivered quantities. Reads only what RLS lets the customer see. */
import { supabase } from "@/integrations/supabase/client";

export type DeliveredLine = {
  orderLineId: string;
  delivered: number;
  short: number;
  damaged: number;
  refused: number;
  empties: number;
};

export type DeliveryProof = {
  deliveredAt: string | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  deliveredBy: string | null;
  failReason: string | null;
  lines: DeliveredLine[];
};

const n = (v: unknown) => Number(v ?? 0) || 0;

/** null when nothing is visible (not delivered yet, or not readable). */
export async function fetchDeliveryProof(orderId: string): Promise<DeliveryProof | null> {
  const { data: stops, error } = await supabase
    .from("trip_stops")
    .select("id, delivered_at, photo_url, signature_url, fail_reason, trip_id, delivery_lines(order_line_id, delivered_qty, short_qty, damaged_qty, refused_qty, empties_returned)")
    .eq("order_id", orderId)
    .order("delivered_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error || !stops?.length) return null;
  const s = stops[0]!;
  let deliveredBy: string | null = null;
  if (s.trip_id) {
    const { data: trip } = await supabase.from("trips").select("driver_user_id").eq("id", s.trip_id).maybeSingle();
    if (trip?.driver_user_id) {
      const { data: p } = await supabase.from("user_profiles").select("full_name").eq("id", trip.driver_user_id).maybeSingle();
      deliveredBy = p?.full_name ?? null;
    }
  }
  return {
    deliveredAt: s.delivered_at,
    photoUrl: await signed(s.photo_url),
    signatureUrl: await signed(s.signature_url),
    deliveredBy,
    failReason: s.fail_reason,
    lines: ((s.delivery_lines ?? []) as Record<string, unknown>[]).map((l) => ({
      orderLineId: String(l["order_line_id"]),
      delivered: n(l["delivered_qty"]),
      short: n(l["short_qty"]),
      damaged: n(l["damaged_qty"]),
      refused: n(l["refused_qty"]),
      empties: n(l["empties_returned"]),
    })),
  };
}

/** Storage paths become short-lived signed URLs; full URLs pass through. */
async function signed(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const [bucket, ...rest] = path.split("/");
  if (!bucket || !rest.length) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), 600);
  return data?.signedUrl ?? null;
}

/** Which issues a line has (for the red/amber marks). */
export function lineIssues(l: DeliveredLine): Array<"short" | "damaged" | "returned"> {
  const out: Array<"short" | "damaged" | "returned"> = [];
  if (l.short > 0) out.push("short");
  if (l.damaged > 0) out.push("damaged");
  if (l.refused > 0) out.push("returned");
  return out;
}

/** Show the delivery OTP big only while the order is out for delivery. */
export function showDeliveryOtp(status: string, otp: string | null | undefined): boolean {
  return status === "dispatched" && !!otp && String(otp).trim() !== "";
}
