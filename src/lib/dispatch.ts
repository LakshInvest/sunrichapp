/** Who brings the order + GST bill details — read through my_order_dispatch only. */
import { supabase } from "@/integrations/supabase/client";

export type OrderDispatch = {
  status: string;
  dispatchedAt: string | null;
  vehicleNo: string | null;
  driverName: string | null;
  driverMobile: string | null;
  transporter: string | null;
  lrNo: string | null;
  ownVehicle: boolean;
  liveLocation: boolean;
  invoiceId: string | null;
  invoiceNo: string | null;
  challanNo: string | null;
  einvoice: { irn: string; ackNo: string | null; ackDate: string | null; signedQr: string | null; sandbox: boolean } | null;
  ewayBill: { no: string; validTill: string | null } | null;
};

const s = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());

export function parseDispatch(raw: unknown): OrderDispatch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const e = r["einvoice"] as Record<string, unknown> | null | undefined;
  const w = r["eway_bill"] as Record<string, unknown> | null | undefined;
  return {
    status: String(r["status"] ?? ""),
    dispatchedAt: s(r["dispatched_at"]),
    vehicleNo: s(r["vehicle_no"]),
    driverName: s(r["driver_name"]),
    driverMobile: s(r["driver_mobile"]),
    transporter: s(r["transporter"]),
    lrNo: s(r["lr_no"]),
    ownVehicle: r["own_vehicle"] === true,
    liveLocation: r["live_location"] === true,
    invoiceId: s(r["invoice_id"]),
    invoiceNo: s(r["invoice_no"]),
    challanNo: s(r["challan_no"]),
    einvoice: e && s(e["irn"]) ? { irn: s(e["irn"])!, ackNo: s(e["ack_no"]), ackDate: s(e["ack_date"]), signedQr: s(e["signed_qr"]), sandbox: e["sandbox"] === true } : null,
    ewayBill: w && s(w["no"]) ? { no: s(w["no"])!, validTill: s(w["valid_till"]) } : null,
  };
}

/** "On the way" card shows only while dispatched; map pin only with live location. */
export const showOnTheWay = (d: OrderDispatch | null) => d?.status === "dispatched";
export const showLivePin = (d: OrderDispatch | null) => !!d && d.status === "dispatched" && d.liveLocation;
export const callHref = (d: OrderDispatch | null) => {
  const m = (d?.driverMobile ?? "").replace(/[^\d+]/g, "");
  return m.length >= 10 ? `tel:${m}` : null;
};
export const shortIrn = (irn: string) => (irn.length > 16 ? `${irn.slice(0, 8)}…${irn.slice(-6)}` : irn);

export async function fetchOrderDispatch(orderId: string): Promise<OrderDispatch | null> {
  const { data, error } = await supabase.rpc("my_order_dispatch" as never, { p_order_id: orderId } as never);
  if (error) throw new Error(error.message);
  return parseDispatch(data);
}

/* ---------- GSTIN auto-fill ---------- */

export type GstLookup = {
  legalName: string | null; tradeName: string | null; addressLine1: string | null; addressLine2: string | null;
  city: string | null; pincode: string | null; status: string | null; blocked: boolean;
};

export async function lookupGstin(gstin: string): Promise<{ ok: true; result: GstLookup } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("gst-docs", { body: { action: "gstin_lookup", gstin } });
    if (error) return { ok: false, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    const r = d["result"] as Record<string, unknown> | undefined;
    if (!d["ok"] || !r) return { ok: false, error: s(d["error"]) ?? "" };
    return { ok: true, result: {
      legalName: s(r["legal_name"]), tradeName: s(r["trade_name"]), addressLine1: s(r["address_line1"]), addressLine2: s(r["address_line2"]),
      city: s(r["city"]), pincode: s(r["pincode"]), status: s(r["status"]), blocked: r["blocked"] === true,
    } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

type Fillable = { businessName: string; addressLine1: string; addressLine2: string; city: string; pincode: string };
/** Fills only empty fields from the GST lookup. */
export function fillFromGst<T extends Fillable>(f: T, g: GstLookup): T {
  const pick = (cur: string, v: string | null) => (cur.trim() ? cur : v ?? cur);
  return {
    ...f,
    businessName: pick(f.businessName, g.tradeName ?? g.legalName),
    addressLine1: pick(f.addressLine1, g.addressLine1),
    addressLine2: pick(f.addressLine2, g.addressLine2),
    city: pick(f.city, g.city),
    pincode: pick(f.pincode, g.pincode),
  };
}
export const gstInactive = (g: GstLookup) => !!g.status && g.status.toUpperCase() !== "ACT";
