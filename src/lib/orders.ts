import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Customer order data layer, read through the browser Supabase client so the
 * existing RLS scopes every read: a customer sees own orders, a distributor
 * additionally sees orders routed to them (orders_read policy).
 * Writes go through the existing SECURITY DEFINER RPCs only.
 */

export type OrderLineDto = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  packLabel: string | null;
  qty: number;
  unitPrice: number;
  mrp: number | null;
  lineTotal: number;
  depositTotal: number;
  newContainers: number;
};

export type OrderHistoryRow = { toStatus: string | null; changedAt: string; note: string | null };

export type OrderDto = {
  id: string;
  orderNo: string;
  status: string;
  holdReason: string | null;
  cancelReason: string | null;
  itemsTotal: number;
  depositTotal: number;
  grandTotal: number;
  paymentMode: string | null;
  createdAt: string;
  dueDate: string | null;
  deliveryDate: string | null;
  deliverySlot: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryLandmark: string | null;
  deliveryCity: string | null;
  deliveryPincode: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  notes: string | null;
  fulfillerCustomerId: string | null;
  distributorStatus: string | null;
  businessName: string | null;
  customerMobile: string | null;
  lines: OrderLineDto[];
  history: OrderHistoryRow[];
};

const ORDER_SELECT =
  "id, order_no, status, hold_reason, cancel_reason, items_total, deposit_total, grand_total, payment_mode, created_at, due_date, delivery_date, delivery_slot, delivery_address_line1, delivery_address_line2, delivery_landmark, delivery_city, delivery_pincode, delivery_latitude, delivery_longitude, notes, fulfiller_customer_id, distributor_status, business_name, customer_mobile, order_lines(id, product_id, product_code, product_name, pack_label, qty, unit_price, mrp, line_total, deposit_total, new_containers, sort_order), order_status_history(to_status, changed_at, note)";

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapOrder(r: any): OrderDto {
  return {
    id: String(r["id"]),
    orderNo: String(r["order_no"] ?? ""),
    status: String(r["status"] ?? "placed"),
    holdReason: (r["hold_reason"] as string) ?? null,
    cancelReason: (r["cancel_reason"] as string) ?? null,
    itemsTotal: n(r["items_total"]),
    depositTotal: n(r["deposit_total"]),
    grandTotal: n(r["grand_total"]),
    paymentMode: (r["payment_mode"] as string) ?? null,
    createdAt: String(r["created_at"] ?? ""),
    dueDate: (r["due_date"] as string) ?? null,
    deliveryDate: (r["delivery_date"] as string) ?? null,
    deliverySlot: (r["delivery_slot"] as string) ?? null,
    deliveryAddressLine1: (r["delivery_address_line1"] as string) ?? null,
    deliveryAddressLine2: (r["delivery_address_line2"] as string) ?? null,
    deliveryLandmark: (r["delivery_landmark"] as string) ?? null,
    deliveryCity: (r["delivery_city"] as string) ?? null,
    deliveryPincode: (r["delivery_pincode"] as string) ?? null,
    deliveryLatitude: r["delivery_latitude"] != null ? n(r["delivery_latitude"]) : null,
    deliveryLongitude: r["delivery_longitude"] != null ? n(r["delivery_longitude"]) : null,
    notes: (r["notes"] as string) ?? null,
    fulfillerCustomerId: (r["fulfiller_customer_id"] as string) ?? null,
    distributorStatus: (r["distributor_status"] as string) ?? null,
    businessName: (r["business_name"] as string) ?? null,
    customerMobile: (r["customer_mobile"] as string) ?? null,
    lines: ((r["order_lines"] ?? []) as any[])
      .map((l) => ({
        id: String(l["id"]),
        productId: String(l["product_id"]),
        productCode: String(l["product_code"] ?? ""),
        productName: String(l["product_name"] ?? ""),
        packLabel: (l["pack_label"] as string) ?? null,
        qty: n(l["qty"]),
        unitPrice: n(l["unit_price"]),
        mrp: l["mrp"] != null ? n(l["mrp"]) : null,
        lineTotal: n(l["line_total"]),
        depositTotal: n(l["deposit_total"]),
        newContainers: n(l["new_containers"]),
      }))
      .sort((a, b) => a.lineTotal - b.lineTotal),
    history: ((r["order_status_history"] ?? []) as any[])
      .map((h) => ({
        toStatus: (h["to_status"] as string) ?? null,
        changedAt: String(h["changed_at"] ?? ""),
        note: (h["note"] as string) ?? null,
      }))
      .sort((a, b) => a.changedAt.localeCompare(b.changedAt)),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The signed-in customer's customers.id (null while unregistered). */
export async function getMyCustomerId(): Promise<string | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return null;
  const { data: prof } = await supabase
    .from("user_profiles")
    .select("customer_id")
    .eq("id", user.user.id)
    .maybeSingle();
  return (prof?.customer_id as string) ?? null;
}

export type OrderGroup = "active" | "delivered" | "cancelled";

const ACTIVE_STATUSES = ["placed", "credit_hold", "approved", "processing", "dispatched"];
const DELIVERED_STATUSES = ["delivered", "closed"];
const CANCELLED_STATUSES = ["cancelled", "rejected"];

export function statusGroup(status: string): OrderGroup {
  if (DELIVERED_STATUSES.includes(status)) return "delivered";
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";
  return "active";
}

/** All of my orders (RLS-scoped to me), newest first. */
export async function fetchMyOrders(): Promise<OrderDto[]> {
  const mine = await getMyCustomerId();
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[])
    .filter((r) => mine == null || r["customer_id"] === mine)
    .map(mapOrder);
}

/** Orders routed to me as the area distributor (Inbox). */
export async function fetchInboxOrders(): Promise<OrderDto[]> {
  const mine = await getMyCustomerId();
  if (!mine) return [];
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("fulfiller_customer_id", mine)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(mapOrder);
}

export type InboxTab = "new" | "toDeliver" | "done";

export function inboxGroup(order: OrderDto): InboxTab {
  const ds = order.distributorStatus;
  if (ds === "pending") return "new";
  if (ds === "accepted" || order.status === "processing" || order.status === "dispatched") return "toDeliver";
  return "done";
}

/* ---------- tracking timeline (Task 4) ---------- */

export type TimelineStep = { key: string; time: string | null };

/** Placed → Confirmed → Packed → Out for delivery → Delivered, with times. */
export function buildTimeline(status: string, history: OrderHistoryRow[]): { steps: TimelineStep[]; reached: number } {
  const timeFor = (key: string): string | null => {
    const rows = history.filter((h) => h.toStatus === key && h.changedAt);
    return rows.length ? (rows[rows.length - 1]?.changedAt ?? null) : null;
  };
  const placedAt = history[0]?.changedAt || null;
  const steps: TimelineStep[] = [
    { key: "placed", time: placedAt },
    { key: "approved", time: timeFor("approved") },
    { key: "processing", time: timeFor("processing") },
    { key: "dispatched", time: timeFor("dispatched") },
    { key: "delivered", time: timeFor("delivered") },
  ];
  const rank = (s: string): number => {
    if (s === "placed" || s === "credit_hold") return 0;
    if (s === "approved") return 1;
    if (s === "processing") return 2;
    if (s === "dispatched") return 3;
    if (s === "delivered" || s === "closed") return 4;
    return -1;
  };
  const order = rank(status);
  return { steps, reached: order < 0 ? 0 : order };
}

/* ---------- in-app update bell (Task 7) ---------- */

const SEEN_KEY = "sunrich.ordersSeenAt";

export function readOrdersSeenAt(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Marks every current status change as seen (called when My orders opens). */
export function markOrdersSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    /* best effort */
  }
}

/** True when any of my orders got a new status entry since My orders was last opened. */
export async function hasOrderUpdates(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_status_history(changed_at)")
      .limit(200);
    if (error) return false;
    const seen = readOrdersSeenAt();
    if (!seen) return ((data ?? []) as any[]).length > 0;
    return ((data ?? []) as any[]).some((o) =>
      ((o["order_status_history"] ?? []) as any[]).some((h) => String(h["changed_at"] ?? "") > seen),
    );
  } catch {
    return false;
  }
}

/* ---------- RPC wrappers (existing database functions) ---------- */

export type QuoteLine = { product_id: string; qty: number; new_containers: number };

export type QuoteResult = {
  lines: Array<{
    product_id: string;
    product_code: string;
    product_name: string;
    pack_label: string | null;
    qty: number;
    unit_price: number;
    mrp: number | null;
    line_total: number;
    deposit_per_unit: number;
    deposit_total: number;
    new_containers: number;
    fulfiller_customer_id: string | null;
  }>;
  items_total: number;
  deposit_total: number;
  tax_total: number;
  parts: number;
  credit_limit: number;
  credit_available: number;
  credit_blocked: boolean;
  overdue: number;
};

export async function quoteMyOrder(lines: QuoteLine[]): Promise<QuoteResult> {
  const { data, error } = await supabase.rpc("quote_my_order", { p_lines: lines });
  if (error) throw new Error(error.message);
  return data as QuoteResult;
}

export type PlacedOrder = {
  order_id: string;
  order_no: string;
  status: string;
  hold_reason: string | null;
  grand_total: number;
  payment_mode: string;
  fulfilled_by: string;
};

export async function placeMyOrder(
  lines: QuoteLine[],
  delivery: {
    address_line1: string | null;
    address_line2: string | null;
    landmark: string | null;
    city: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    delivery_date: string;
    delivery_slot: string;
  },
  notes: string | null,
): Promise<PlacedOrder[]> {
  const { data, error } = await supabase.rpc("place_my_order", notes ? { p_lines: lines, p_delivery: delivery, p_notes: notes } : { p_lines: lines, p_delivery: delivery });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlacedOrder[];
}

export async function cancelMyOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId, p_reason: reason });
  if (error) throw new Error(error.message);
}

export async function distributorRespond(orderId: string, accept: boolean, reason?: string): Promise<void> {
  const args: { p_order_id: string; p_accept: boolean; p_reason?: string } = { p_order_id: orderId, p_accept: accept };
  if (reason) args.p_reason = reason;
  const { error } = await supabase.rpc("distributor_respond", args);
  if (error) throw new Error(error.message);
}

export async function distributorMarkDelivered(orderId: string, delivered: boolean, reason?: string): Promise<void> {
  const args: { p_order_id: string; p_delivered: boolean; p_reason?: string } = { p_order_id: orderId, p_delivered: delivered };
  if (reason) args.p_reason = reason;
  const { error } = await supabase.rpc("distributor_mark_delivered", args);
  if (error) throw new Error(error.message);
}

export type CreditStatus = {
  out_limit: number;
  out_days: number;
  out_outstanding: number;
  out_overdue: number;
  out_oldest_overdue_days: number;
  out_available: number;
  out_blocked: boolean;
  out_block_reason: string | null;
};

export async function fetchCreditStatus(): Promise<CreditStatus | null> {
  const cid = await getMyCustomerId();
  if (!cid) return null;
  const { data, error } = await supabase.rpc("credit_status", { p_customer_id: cid });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as CreditStatus | undefined;
  return row ?? null;
}

/* ---------- distributor detection (Inbox tab) ---------- */

const DIST_CACHE_KEY = "sunrich.isDistributor";

export function cachedIsDistributor(): boolean {
  try {
    return sessionStorage.getItem(DIST_CACHE_KEY) === "1";
  } catch {
    return false;
  }
}

export async function resolveIsDistributor(): Promise<boolean> {
  try {
    const cid = await getMyCustomerId();
    if (!cid) return false;
    const { data } = await supabase
      .from("customers")
      .select("customer_types(code)")
      .eq("id", cid)
      .maybeSingle();
    const type = Array.isArray(data?.customer_types) ? data?.customer_types[0] : data?.customer_types;
    const is = type?.code === "DISTRIBUTOR";
    try {
      sessionStorage.setItem(DIST_CACHE_KEY, is ? "1" : "0");
    } catch {
      /* best effort */
    }
    return is;
  } catch {
    return false;
  }
}

/** Bottom-nav helper: is this user a distributor, and are there new inbox orders? */
export function useDistributorNav(): { isDistributor: boolean; newCount: number } {
  const [isDistributor, setIsDistributor] = useState(cachedIsDistributor);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const is = cachedIsDistributor() ? true : await resolveIsDistributor();
      if (!active || !is) return;
      setIsDistributor(true);
      try {
        const list = await fetchInboxOrders();
        if (active) setNewCount(list.filter((o) => inboxGroup(o) === "new").length);
      } catch {
        /* offline — keep the last count */
      }
    };
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { isDistributor, newCount };
}

/* ---------- misc helpers ---------- */

/** "20 L Water Jar ×2 +1 more" style summary for a list card. */
export function itemsSummary(lines: OrderLineDto[]): { first: string; more: number } {
  const first = lines[0];
  if (!first) return { first: "—", more: 0 };
  const unit = first.qty === 1 ? "×1" : `×${first.qty}`;
  return { first: `${first.productName} ${unit}`, more: Math.max(0, lines.length - 1) };
}

/** yyyy-mm-dd for a date input, n days from today (local time). */
export function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
