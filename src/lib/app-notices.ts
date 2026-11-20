/** In-app notification feed from the server (`my_notifications` / `my_notifications_read`, realtime on `notification_log`). */
import { supabase } from "@/integrations/supabase/client";

export const NOTICE_EVENTS = [
  "request_received", "quote_ready", "quote_expiry_reminder", "quote_expired", "payment_verified",
  "payment_rejected", "payment_mode_changed", "dispatched", "delivered",
] as const;

export type AppNotice = {
  id: number;
  event_key: string;
  order_id: string | null;
  created_at: string;
  read_at: string | null;
  values: Record<string, unknown>;
};

export async function fetchAppNotices(limit = 50): Promise<AppNotice[]> {
  const { data, error } = await supabase.rpc("my_notifications", { p_limit: limit });
  if (error) throw error;
  return Array.isArray(data) ? (data as unknown as AppNotice[]) : [];
}

export async function unreadNoticeCount(): Promise<number> {
  return (await fetchAppNotices(50)).filter((n) => !n.read_at).length;
}

/** null marks every notice as read. */
export async function markNoticesRead(ids: number[] | null): Promise<void> {
  const { error } = await supabase.rpc("my_notifications_read", ids ? { p_ids: ids } : ({ p_ids: null } as unknown as { p_ids?: number[] }));
  if (error) throw error;
}

/** Text values for the title/line templates; amounts as ₹, dates in the given locale. */
export function noticeVars(values: Record<string, unknown>, locale: string, inr: (n: number) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values ?? {})) {
    if (v == null) continue;
    if (/amount$/.test(k) && !isNaN(Number(v))) out[k] = inr(Number(v));
    else if ((k === "valid_till" || k === "delivery_date") && typeof v === "string" && !isNaN(Date.parse(v)))
      out[k] = new Date(v).toLocaleString(locale, { day: "numeric", month: "short", ...(k === "valid_till" ? { hour: "numeric", minute: "2-digit" } : {}) });
    else out[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

export function noticeKey(event: string): string {
  return (NOTICE_EVENTS as readonly string[]).includes(event) ? event : "other";
}

/** Listener set so the Home bell refreshes when a live notice arrives. */
const listeners = new Set<() => void>();
export function onNoticeArrived(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitNoticeArrived() {
  listeners.forEach((fn) => fn());
}
