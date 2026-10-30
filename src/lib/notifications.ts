/** In-app notification feed built from existing customer-readable rows (orders, invoices, queries). */
import { supabase } from "@/integrations/supabase/client";
import { getMyCustomerId } from "@/lib/orders";

export type NoticeKind = "status" | "approved" | "credit_hold" | "delivered" | "invoice" | "reply" | "cancelled" | "dispatched";
export type Notice = {
  id: string;
  kind: NoticeKind;
  at: string;
  ref: string;
  target: { to: "/track/$id"; id: string } | { to: "/invoice/$id"; id: string } | { to: "/queries/$id"; id: string };
  status?: string;
};

const SEEN_KEY = "sunrich.noticesSeenAt"; // per device (localStorage)

export function readNoticesSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}
export function markNoticesSeen(at = new Date().toISOString()) {
  try {
    localStorage.setItem(SEEN_KEY, at);
  } catch {
    /* ignore */
  }
}

export function kindForStatus(s: string): NoticeKind {
  if (s === "approved") return "approved";
  if (s === "credit_hold") return "credit_hold";
  if (s === "delivered" || s === "closed") return "delivered";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  if (s === "dispatched") return "dispatched";
  return "status";
}

export function isUnread(n: Pick<Notice, "at">, seen: string | null): boolean {
  return !seen || n.at > seen;
}

export async function fetchNotices(): Promise<Notice[]> {
  const cid = await getMyCustomerId();
  if (!cid) return [];
  const [orders, invoices, queries] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_no, order_status_history(to_status, changed_at)")
      .eq("customer_id", cid)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("invoices").select("id, invoice_no, invoice_date, created_at").eq("customer_id", cid).order("created_at", { ascending: false }).limit(30),
    supabase.from("customer_queries").select("id, subject, status, updated_at").eq("status", "open").limit(30),
  ]);
  const out: Notice[] = [];
  for (const o of orders.data ?? []) {
    for (const h of (o.order_status_history ?? []) as { to_status: string; changed_at: string }[]) {
      out.push({
        id: `o-${o.id}-${h.changed_at}`,
        kind: kindForStatus(h.to_status),
        at: h.changed_at,
        ref: o.order_no ?? "",
        status: h.to_status,
        target: { to: "/track/$id", id: o.id },
      });
    }
  }
  for (const i of invoices.data ?? []) {
    out.push({ id: `i-${i.id}`, kind: "invoice", at: i.created_at ?? i.invoice_date, ref: i.invoice_no, target: { to: "/invoice/$id", id: i.id } });
  }
  for (const q of queries.data ?? []) {
    out.push({ id: `q-${q.id}`, kind: "reply", at: q.updated_at, ref: q.subject ?? "", target: { to: "/queries/$id", id: q.id } });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}

export async function hasUnreadNotices(): Promise<boolean> {
  const seen = readNoticesSeen();
  const list = await fetchNotices();
  return list.some((n) => isUnread(n, seen));
}
