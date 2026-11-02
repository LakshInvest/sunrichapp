/** In-app notification feed built from existing customer-readable rows (orders, invoices, queries). */
import { supabase } from "@/integrations/supabase/client";
import { getMyCustomerId } from "@/lib/orders";
import { formatINR } from "@/lib/catalogue";

export type NoticeKind = "status" | "approved" | "credit_hold" | "delivered" | "invoice" | "reply" | "cancelled" | "dispatched" | "pay_verified" | "pay_verified_adv" | "pay_rejected";
export type Notice = {
  id: string;
  kind: NoticeKind;
  at: string;
  ref: string;
  target: { to: "/track/$id"; id: string } | { to: "/invoice/$id"; id: string } | { to: "/queries/$id"; id: string } | { to: "/khata"; id: string };
  status?: string;
  /** Interpolation values for the notice title (payments). */
  params?: Record<string, string>;
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
  const [orders, invoices, queries, proofs] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_no, order_status_history(to_status, changed_at)")
      .eq("customer_id", cid)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("invoices").select("id, invoice_no, invoice_date, created_at").eq("customer_id", cid).order("created_at", { ascending: false }).limit(30),
    supabase.from("customer_queries").select("id, subject, status, updated_at").eq("customer_id", cid).eq("status", "open").limit(30),
    supabase
      .from("payment_proofs")
      .select("id, amount, reference, status, reject_reason, balance_after, reviewed_at")
      .eq("customer_id", cid)
      .in("status", ["verified", "rejected"])
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(30),
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
  for (const p of proofs.data ?? []) {
    out.push(paymentNotice(p));
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
}

export async function hasUnreadNotices(): Promise<boolean> {
  const seen = readNoticesSeen();
  const list = await fetchNotices();
  return list.some((n) => isUnread(n, seen));
}

/** Verified / rejected payment → notice (amount, new balance or the reason). */
export function paymentNotice(p: {
  id: string;
  amount: number | null;
  reference: string | null;
  status: string;
  reject_reason: string | null;
  balance_after: number | null;
  reviewed_at: string | null;
}): Notice {
  const verified = p.status === "verified";
  const adv = verified && Number(p.balance_after ?? 0) < 0;
  return {
    id: `p-${p.id}`,
    kind: verified ? (adv ? "pay_verified_adv" : "pay_verified") : "pay_rejected",
    at: p.reviewed_at ?? "",
    ref: p.reference ?? "",
    target: { to: "/khata", id: p.id },
    params: verified
      ? { amount: formatINR(Number(p.amount ?? 0)), balance: formatINR(Math.abs(Number(p.balance_after ?? 0))) }
      : { amount: formatINR(Number(p.amount ?? 0)), reason: p.reject_reason ?? "" },
  };
}
