import { supabase } from "@/integrations/supabase/client";
import { istToday } from "@/lib/ist";

/**
 * Prompt-70 "Quote → Pay" flow. All money comes from the backend RPCs;
 * the app never shows a rate before the order status is quote_sent or later.
 */

export type QuoteMode = "sunrich" | "pickup";

export type QuoteDetail = {
  order: {
    id: string;
    order_no: string;
    status: string;
    delivery_mode: QuoteMode | null;
    delivery_date: string | null;
    address: string | null;
    grand_total: number | null;
    quote_expires_at: string | null;
    payment_method: string | null;
    required_payment_method: string | null;
    placed_by_kind: string | null;
  };
  items: { line_id: string; name: string; pack_label: string | null; qty: number; is_free: boolean; scheme: string | null; discount: number | null; rate: number | null; total: number | null }[];
  parts: { order_no: string; status: string; packs: number | null; vehicle_no: string | null; driver_name: string | null; driver_mobile: string | null; transporter: string | null; invoice_id: string | null; invoice_no: string | null; invoice_total: number | null; delivered_at: string | null }[];
  notes: { body: string; by: string | null; at: string }[];
  payments: { method: string; amount: number | null; reference: string | null; status: string | null; reject_reason: string | null; at: string }[];
  history: { status: string | null; note: string | null; by: string | null; at: string }[];
};

export type PayOptions = {
  amount: number;
  methods: PayMethod[];
  required_method: string | null;
  proof_required: boolean;
  pay_to: { firm?: string | null; payee?: string | null; upi_id?: string | null; bank?: string | null; account_name?: string | null; account_number?: string | null; ifsc?: string | null; branch?: string | null } | null;
};
export type PayMethod = "upi" | "bank" | "cash" | "credit";

/* ---------- pure rules (tested) ---------- */

/** Allowed delivery dates: today … today+30; default tomorrow (IST). */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return dt.toISOString().slice(0, 10);
}
export function quoteDateBounds(now = new Date()) {
  const today = istToday(now);
  return { min: today, max: addDaysIso(today, 30), def: addDaysIso(today, 1) };
}
export function isAllowedDate(iso: string, now = new Date()): boolean {
  const b = quoteDateBounds(now);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= b.min && iso <= b.max;
}

export const ACTION_STATUSES = ["quote_sent", "quote_accepted", "payment_rejected", "quote_expired"];
export function needsAction(status: string): boolean {
  return ACTION_STATUSES.includes(status);
}

export type Tone = "amber" | "blue" | "purple" | "teal" | "green" | "grey";
export function statusTone(status: string): Tone {
  if (status === "quote_requested") return "amber";
  if (status === "quote_sent") return "blue";
  if (["quote_accepted", "payment_submitted", "payment_rejected"].includes(status)) return "purple";
  if (["approved", "allotted", "ready_to_dispatch", "dispatched", "processing"].includes(status)) return "teal";
  if (["delivered", "closed"].includes(status)) return "green";
  return "grey";
}
export const TONE_CLASS: Record<Tone, string> = {
  amber: "bg-warning/20 text-warning-foreground",
  blue: "bg-secondary/20 text-primary",
  purple: "bg-accent/20 text-accent-foreground",
  teal: "bg-secondary/15 text-secondary-foreground",
  green: "bg-success/15 text-success",
  grey: "bg-muted text-muted-foreground",
};

/** Tracking steps after payment: Payment verified → Allotted → Ready → Dispatched → Delivered. */
export const TRACK_STEPS = ["approved", "allotted", "ready_to_dispatch", "dispatched", "delivered"] as const;
export function trackStep(status: string): number {
  if (status === "closed") return 4;
  if (status === "processing") return 1;
  return TRACK_STEPS.indexOf(status as (typeof TRACK_STEPS)[number]);
}

/** Remaining time until the quote expires; null once expired. */
export function countdown(expires: string | null, now = new Date()): { hours: number; minutes: number } | null {
  if (!expires) return null;
  const ms = new Date(expires).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}

/** Only paid lines whose qty changed are sent; 0 removes. FREE lines are never sent. */
export function changedQty(items: QuoteDetail["items"], edits: Record<string, number>): { line_id: string; qty: number }[] {
  return items
    .filter((i) => !i.is_free && edits[i.line_id] !== undefined && edits[i.line_id] !== i.qty)
    .map((i) => ({ line_id: i.line_id, qty: Math.max(0, Math.floor(edits[i.line_id] ?? 0)) }));
}

/** Customer-action orders first, then newest. */
export function sortForAction<T extends { status: string; createdAt: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(needsAction(b.status)) - Number(needsAction(a.status)) || b.createdAt.localeCompare(a.createdAt));
}

export function whoKey(by: string | null | undefined): "you" | "salesman" | "sunrich" {
  return by === "customer" ? "you" : by === "salesman" ? "salesman" : "sunrich";
}

/** Proof (UTR) needed for UPI/bank only when the backend says so. */
export function paymentReady(method: PayMethod | null, ref: string, proofRequired: boolean, cashTo: string | null): boolean {
  if (!method) return false;
  if (method === "cash") return cashTo === "office" || cashTo === "salesman";
  if (method === "credit") return true;
  return !proofRequired || ref.trim().length > 0;
}

/* ---------- RPC wrappers ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) {
    console.error(fn, error);
    throw new Error(error.message);
  }
  return data as T;
}

export function requestQuote(lines: { product_id: string; qty: number }[], delivery: { delivery_mode: QuoteMode; delivery_date: string; address_id?: string }, note: string | null) {
  return call<{ order_id: string; order_no: string; status: string }>("request_quote", { p_lines: lines, p_delivery: delivery, p_note: note });
}
export async function fetchOrderDetail(orderId: string): Promise<QuoteDetail> {
  const d = await call<any>("my_order_detail", { p_order_id: orderId });
  return {
    order: d?.order ?? {},
    items: Array.isArray(d?.items) ? d.items : [],
    parts: Array.isArray(d?.parts) ? d.parts : [],
    notes: Array.isArray(d?.notes) ? d.notes : [],
    payments: Array.isArray(d?.payments) ? d.payments : [],
    history: Array.isArray(d?.history) ? d.history : [],
  };
}
export function respondQuote(orderId: string, accept: boolean, opts: { qty?: { line_id: string; qty: number }[]; reason?: string | null }) {
  const args: Record<string, unknown> = { p_order_id: orderId, p_accept: accept };
  if (accept && opts.qty && opts.qty.length) args["p_qty"] = opts.qty;
  if (!accept && opts.reason) args["p_reason"] = opts.reason;
  return call<unknown>("respond_quote", args);
}
export const requoteOrder = (orderId: string) => call<unknown>("requote_my_order", { p_order_id: orderId });
export const addOrderNote = (orderId: string, body: string) => call<unknown>("add_order_note", { p_order_id: orderId, p_body: body });
const PAY_METHODS = ["upi", "bank", "cash", "credit"] as const;
/** Modes the customer may pick: the office-set mode wins; otherwise CC's my_payment_modes (Prompt-80 §1). */
export function allowedPayMethods(orderMethods: unknown[], ccModes: unknown, required: string | null): PayMethod[] {
  if (required && (PAY_METHODS as readonly string[]).includes(required)) return [required as PayMethod];
  const base = orderMethods.filter((m): m is PayMethod => (PAY_METHODS as readonly unknown[]).includes(m));
  if (!Array.isArray(ccModes)) return base;
  const cc = new Set(ccModes.map(String));
  return (base.length ? base : [...PAY_METHODS]).filter((m) => cc.has(m));
}
export async function fetchPayOptions(orderId: string): Promise<PayOptions> {
  const [d, modes] = await Promise.all([
    call<any>("my_payment_options", { p_order_id: orderId }),
    call<unknown>("my_payment_modes", {}).catch(() => null),
  ]);
  const required = d?.required_method ?? null;
  return {
    amount: Number(d?.amount ?? 0),
    methods: allowedPayMethods(Array.isArray(d?.methods) ? d.methods : [], modes, required),
    required_method: required,
    proof_required: d?.proof_required === true,
    pay_to: d?.pay_to ?? null,
  };
}
export function submitOrderPayment(orderId: string, method: PayMethod, reference: string | null, screenshotPath: string | null, cashPaidTo: string | null) {
  return call<unknown>("submit_order_payment", { p_order_id: orderId, p_method: method, p_reference: reference, p_screenshot_path: screenshotPath, p_cash_paid_to: cashPaidTo });
}
export const TICKET_TOPICS = ["payment", "delivery", "quality", "rate", "other"] as const;
export function raiseTicket(a: { category: string; subject: string; message: string; orderId: string | null; attachmentPath: string | null; attachmentName: string | null }) {
  return call<any>("raise_ticket", { p_category: a.category, p_subject: a.subject, p_message: a.message, p_order_id: a.orderId, p_attachment_path: a.attachmentPath, p_attachment_name: a.attachmentName });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------- Orders tab ---------- */
export type MainOrder = { id: string; orderNo: string; status: string; createdAt: string; grandTotal: number | null; deliveryMode: QuoteMode; deliveryDate: string | null; placedByKind: string | null; lines: { name: string; qty: number; isFree: boolean }[] };

export type OrderFilter = "all" | "action" | "active" | "done";
export function matchesOrderFilter(status: string, filter: OrderFilter): boolean {
  const done = ["delivered", "closed", "cancelled", "rejected", "quote_rejected"].includes(status);
  return filter === "all" || (filter === "action" ? needsAction(status) : filter === "done" ? done : !done);
}
export function orderFilterCounts(orders: Pick<MainOrder, "status">[]): Record<OrderFilter, number> {
  return {
    all: orders.length,
    action: orders.filter((o) => matchesOrderFilter(o.status, "action")).length,
    active: orders.filter((o) => matchesOrderFilter(o.status, "active")).length,
    done: orders.filter((o) => matchesOrderFilter(o.status, "done")).length,
  };
}
export function orderItemCounts(lines: MainOrder["lines"]): { items: number; packs: number } {
  const paid = lines.filter((line) => !line.isFree && line.qty > 0);
  return { items: paid.length, packs: paid.reduce((sum, line) => sum + line.qty, 0) };
}

/** Total is shown only once a quote has come. */
export function showTotal(status: string, total: number | null): boolean {
  return total != null && total > 0 && !["quote_requested"].includes(status);
}

export async function fetchMyMainOrders(): Promise<MainOrder[]> {
  const { getMyCustomerId } = await import("@/lib/my-customer");
  const mine = await getMyCustomerId();
  if (!mine) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_id, order_no, status, created_at, grand_total, delivery_mode, delivery_date, placed_by_kind, order_lines(product_name, qty, is_free)")
    .eq("customer_id", mine)
    .is("parent_order_id", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) { console.error("orders", error); throw new Error(error.message); }
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).filter((r) => r.customer_id === mine).map((r) => ({
    id: String(r.id), orderNo: String(r.order_no ?? ""), status: String(r.status ?? ""), createdAt: String(r.created_at ?? ""),
    grandTotal: r.grand_total != null ? Number(r.grand_total) : null, deliveryMode: r.delivery_mode === "pickup" ? "pickup" : "sunrich",
    deliveryDate: r.delivery_date ?? null, placedByKind: r.placed_by_kind ?? null,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    lines: ((r.order_lines ?? []) as any[]).map((l) => ({ name: String(l.product_name ?? ""), qty: Number(l.qty ?? 0), isFree: l.is_free === true })),
  }));
}

export async function fetchActionCount(): Promise<number> {
  const { ownCustomerFilter } = await import("@/lib/my-customer");
  const cid = await ownCustomerFilter();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", cid).is("parent_order_id", null).in("status", ACTION_STATUSES as never);
  return count ?? 0;
}
