/** Checkout payment methods, payment proofs and dispatch-time helpers.
 *  Writes go through the existing SECURITY DEFINER RPCs only; reads are RLS-scoped. */
import { supabase } from "@/integrations/supabase/client";

export const PAY_METHODS = ["credit", "cash", "upi", "bank", "cheque"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export type ProofStatus = "pending" | "verified" | "rejected";

export type PaymentProof = {
  id: string;
  orderId: string | null;
  orderNo: string | null;
  amount: number;
  method: string;
  reference: string | null;
  paidOn: string;
  screenshotPath: string | null;
  status: ProofStatus;
  rejectReason: string | null;
  createdAt: string;
};

/** Pre-selected method at checkout: credit when the customer has one and is not blocked, cash otherwise. */
export function defaultPayMethod(quote: { credit_limit: number; credit_blocked: boolean } | null | undefined): PayMethod {
  if (quote && quote.credit_limit > 0 && !quote.credit_blocked) return "credit";
  return "cash";
}

/** UTR / UPI reference: exactly 12 digits. */
export function validUtr(v: string): boolean {
  return /^\d{12}$/.test(v.trim());
}

export async function setOrderPaymentMethod(orderIds: string[], method: PayMethod): Promise<void> {
  const { error } = await supabase.rpc("set_order_payment_method", { p_order_ids: orderIds, p_method: method });
  if (error) throw new Error(error.message);
}

export type ProofInput = {
  amount: number;
  method: string;
  reference?: string | null;
  paidOn?: string | null;
  screenshotPath?: string | null;
  orderId?: string | null;
};

export async function submitPaymentProof(input: ProofInput): Promise<string> {
  const args: {
    p_amount: number;
    p_method: string;
    p_reference?: string;
    p_paid_on?: string;
    p_screenshot_path?: string;
    p_order_id?: string;
  } = { p_amount: input.amount, p_method: input.method };
  if (input.reference?.trim()) args["p_reference"] = input.reference.trim();
  if (input.paidOn) args["p_paid_on"] = input.paidOn;
  if (input.screenshotPath) args["p_screenshot_path"] = input.screenshotPath;
  if (input.orderId) args["p_order_id"] = input.orderId;
  const { data, error } = await supabase.rpc("submit_payment_proof", args);
  if (error) throw new Error(error.message);
  return String(data);
}

/** All payment proofs the customer submitted, newest first (RLS scopes to own rows). */
export async function fetchMyPaymentProofs(): Promise<PaymentProof[]> {
  const { data, error } = await supabase
    .from("payment_proofs")
    .select("id, order_id, amount, method, reference, paid_on, screenshot_path, status, reject_reason, created_at, orders(order_no)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const o = (r as { orders?: { order_no?: string | null } | null }).orders;
    return {
      id: String(r.id),
      orderId: (r.order_id as string) ?? null,
      orderNo: o?.order_no ?? null,
      amount: Number(r.amount ?? 0),
      method: String(r.method ?? ""),
      reference: (r.reference as string) ?? null,
      paidOn: String(r.paid_on ?? ""),
      screenshotPath: (r.screenshot_path as string) ?? null,
      status: (r.status as ProofStatus) ?? "pending",
      rejectReason: (r.reject_reason as string) ?? null,
      createdAt: String(r.created_at ?? ""),
    };
  });
}

/** Is the server holding this order back until a payment is verified? */
export async function fetchPaymentHold(orderId: string): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("order_payment_hold", { p_order_id: orderId });
    return data === true;
  } catch {
    return false;
  }
}

/** The proof that decides what the order shows (latest first). */
export function latestProofFor(proofs: PaymentProof[], orderId: string | null): PaymentProof | null {
  if (!orderId) return null;
  return proofs.find((p) => p.orderId === orderId) ?? null;
}

/** Storage paths become short-lived signed URLs; full URLs pass through. */
export async function signedProofUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const [bucket, ...rest] = path.split("/");
  if (!bucket || !rest.length) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), 600);
  return data?.signedUrl ?? null;
}

const pad = (v: number) => String(v).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** One friendly dispatch line from release_batch_at / released_at / express. */
export function releaseLine(
  order: { releasedAt: string | null; releaseBatchAt: string | null; isExpress: boolean; status: string },
  now = new Date(),
): { key: "dispatchingNow" | "leavesToday" | "leavesTomorrow" | "leavesOn"; time?: string; date?: string } | null {
  if (
    order.releasedAt ||
    order.isExpress ||
    ["processing", "dispatched", "delivered", "closed"].includes(order.status)
  ) {
    return { key: "dispatchingNow" };
  }
  if (!order.releaseBatchAt) return null;
  const b = new Date(order.releaseBatchAt);
  if (Number.isNaN(b.getTime())) return null;
  const time = `${pad(b.getHours())}:${pad(b.getMinutes())}`;
  const bday = dayOf(b);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (bday === dayOf(now)) return { key: "leavesToday", time };
  if (bday === dayOf(tomorrow)) return { key: "leavesTomorrow", time };
  return { key: "leavesOn", time, date: bday };
}
