import { getMyCustomerId, ownCustomerFilter, NO_CUSTOMER } from "@/lib/my-customer";
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
  paidAmount: number;
  paymentStatus: string | null;
  paymentMode: string | null;
  createdAt: string;
  dueDate: string | null;
  deliveryDate: string | null;
  deliverySlot: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryLandmark: string | null;
  deliveryLine2: string | null;
  assignedAt: string | null;
  deliveryCity: string | null;
  deliveryPincode: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  notes: string | null;
  fulfillerCustomerId: string | null;
  distributorStatus: string | null;
  businessName: string | null;
  customerMobile: string | null;
  deliveryMode: "sunrich" | "pickup";
  pickupVehicleNo: string | null;
  deliveryOtp: string | null;
  paymentMethod: string | null;
  releaseBatchAt: string | null;
  releasedAt: string | null;
  isExpress: boolean;
  lines: OrderLineDto[];
  history: OrderHistoryRow[];
};

const ORDER_SELECT =
  "id, customer_id, order_no, status, hold_reason, cancel_reason, items_total, deposit_total, grand_total, amount_paid, payment_status, payment_mode, payment_method, release_batch_at, released_at, is_express, created_at, due_date, delivery_date, delivery_slot, delivery_address_line1, delivery_address_line2, delivery_landmark, delivery_city, delivery_pincode, delivery_latitude, delivery_longitude, notes, fulfiller_customer_id, distributor_status, distributor_assigned_at, business_name, customer_mobile, delivery_mode, pickup_vehicle_no, delivery_otp, order_lines(id, product_id, product_code, product_name, pack_label, qty, unit_price, mrp, line_total, deposit_total, new_containers, sort_order), order_status_history(to_status, changed_at, note)";

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
    paidAmount: n(r["amount_paid"]),
    paymentStatus: (r["payment_status"] as string) ?? null,
    paymentMode: (r["payment_mode"] as string) ?? null,
    createdAt: String(r["created_at"] ?? ""),
    dueDate: (r["due_date"] as string) ?? null,
    deliveryDate: (r["delivery_date"] as string) ?? null,
    deliverySlot: (r["delivery_slot"] as string) ?? null,
    deliveryAddressLine1: (r["delivery_address_line1"] as string) ?? null,
    deliveryAddressLine2: (r["delivery_address_line2"] as string) ?? null,
    deliveryLandmark: (r["delivery_landmark"] as string) ?? null,
    deliveryLine2: (r["delivery_address_line2"] as string) ?? null,
    assignedAt: (r["distributor_assigned_at"] as string) ?? null,
    deliveryCity: (r["delivery_city"] as string) ?? null,
    deliveryPincode: (r["delivery_pincode"] as string) ?? null,
    deliveryLatitude: r["delivery_latitude"] != null ? n(r["delivery_latitude"]) : null,
    deliveryLongitude: r["delivery_longitude"] != null ? n(r["delivery_longitude"]) : null,
    notes: (r["notes"] as string) ?? null,
    fulfillerCustomerId: (r["fulfiller_customer_id"] as string) ?? null,
    distributorStatus: (r["distributor_status"] as string) ?? null,
    businessName: (r["business_name"] as string) ?? null,
    customerMobile: (r["customer_mobile"] as string) ?? null,
    deliveryMode: r["delivery_mode"] === "pickup" ? "pickup" : "sunrich",
    pickupVehicleNo: (r["pickup_vehicle_no"] as string) ?? null,
    deliveryOtp: r["delivery_otp"] != null ? String(r["delivery_otp"]) : null,
    paymentMethod: (r["payment_method"] as string) ?? null,
    releaseBatchAt: (r["release_batch_at"] as string) ?? null,
    releasedAt: (r["released_at"] as string) ?? null,
    isExpress: r["is_express"] === true,
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
export { getMyCustomerId } from "@/lib/my-customer";

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
  if (!mine) return [];
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", mine)
    .order("created_at", { ascending: false });
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
  if (ds === "delivered" || ds === "not_delivered" || ds === "rejected") return "done";
  if (order.status === "delivered" || order.status === "closed") return "done";
  if (ds === "accepted" || order.status === "processing" || order.status === "dispatched") return "toDeliver";
  return "done";
}

/* ---------- tracking timeline (Task 4) ---------- */

export type TimelineStep = { key: string; time: string | null };

/** Placed → Confirmed → Packed → Out for delivery → Delivered, with times. */
export function buildTimeline(status: string, history: OrderHistoryRow[]): { steps: TimelineStep[]; reached: number } {
  const timeFor = (key: string): string | null => {
    const rows = history.filter((h) => h.toStatus === key && h.changedAt);
    const last = rows.at(-1);
    return last ? last.changedAt : null;
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
    const mine = await getMyCustomerId();
    const { data, error } = await supabase
      .from("orders")
      .select("customer_id, order_status_history(changed_at)")
      .eq("customer_id", mine ?? NO_CUSTOMER)
      .limit(200);
    if (error) return false;
    // The bell reflects the customer's own orders; distributor-routed rows are filtered out.
    const rows = ((data ?? []) as any[]).filter((o) => mine == null || String(o["customer_id"] ?? "") === mine);
    const seen = readOrdersSeenAt();
    if (!seen) return rows.length > 0;
    return rows.some((o) =>
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
    firm_id?: string | null;
  }>;
  items_total: number;
  deposit_total: number;
  tax_total: number;
  parts: number;
  credit_limit: number;
  credit_available: number;
  credit_blocked: boolean;
  overdue: number;
  /** True when some firm's share of this order is above that firm's available credit (server holds it). */
  credit_exceeds?: boolean;
};

/**
 * The server checks credit per firm (a firm-specific limit beats the customer
 * limit), while quote_my_order reports the firm-less limit. Re-read credit per
 * firm so checkout shows what the server will actually do.
 */
export async function quoteMyOrder(lines: QuoteLine[], mode?: "sunrich" | "pickup"): Promise<QuoteResult> {
  const { data, error } = await supabase.rpc("quote_my_order", { p_lines: lines, ...(mode ? { p_mode: mode } : {}) });
  if (error) throw new Error(error.message);
  const q = data as QuoteResult;
  try {
    const cid = await getMyCustomerId();
    const byFirm = new Map<string, number>();
    for (const l of q.lines ?? []) {
      if (!l.firm_id) continue;
      byFirm.set(l.firm_id, (byFirm.get(l.firm_id) ?? 0) + Number(l.line_total) + Number(l.deposit_total));
    }
    if (cid && byFirm.size > 0) {
      let limit = 0;
      let available = 0;
      let exceeds = false;
      for (const [firm, total] of byFirm) {
        const { data: cs, error: csErr } = await supabase.rpc("credit_status", { p_customer_id: cid, p_firm_id: firm });
        if (csErr) throw csErr;
        const row = (Array.isArray(cs) ? cs[0] : cs) as CreditStatus | undefined;
        if (!row) continue;
        limit += Number(row.out_limit);
        available += Number(row.out_available);
        if (Number(row.out_limit) > 0 && total > Number(row.out_available)) exceeds = true;
      }
      return { ...q, credit_limit: limit, credit_available: available, credit_exceeds: exceeds };
    }
  } catch {
    /* fall back to the firm-less figures */
  }
  return q;
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
export function itemsSummary(
  lines: OrderLineDto[],
  packs: (n: number) => string = (n) => `×${n}`,
): { first: string; more: number } {
  const first = lines[0];
  if (!first) return { first: "—", more: 0 };
  return { first: `${first.productName} · ${packs(first.qty)}`, more: Math.max(0, lines.length - 1) };
}

/** yyyy-mm-dd for a date input, n days from today (local time). */
export function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export type DeliveryMode = "sunrich" | "pickup";

/** Customer default: customers.default_delivery_mode, else its type's default, else Sunrich. */
export async function fetchMyDefaultDeliveryMode(): Promise<DeliveryMode> {
  const { data } = await supabase
    .from("customers")
    .select("default_delivery_mode, customer_types(default_delivery_mode)")
    .eq("id", await ownCustomerFilter())
    .maybeSingle();
  const r = data as { default_delivery_mode: string | null; customer_types: { default_delivery_mode: string | null } | null } | null;
  return resolveDeliveryMode(r?.default_delivery_mode, r?.customer_types?.default_delivery_mode);
}

export function resolveDeliveryMode(own?: string | null, type?: string | null): DeliveryMode {
  const v = own || type;
  return v === "pickup" ? "pickup" : "sunrich";
}

/** Customer may switch only while placed / credit hold (enforced by the RPC too). */
export function canChangeDeliveryMode(status: string): boolean {
  return status === "placed" || status === "credit_hold";
}

export async function setOrderDeliveryMode(orderId: string, mode: DeliveryMode, vehicleNo: string | null): Promise<void> {
  const { error } = await supabase.rpc("set_order_delivery_mode", {
    p_order_id: orderId,
    p_mode: mode,
    ...(mode === "pickup" && vehicleNo?.trim() ? { p_vehicle_no: vehicleNo.trim() } : {}),
  });
  if (error) throw new Error(error.message);
}
