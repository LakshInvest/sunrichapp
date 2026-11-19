import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requestDataRefresh } from "@/lib/data-refresh";
import { clearUserCaches } from "@/lib/swr-cache";
import { clearMyCustomer } from "@/lib/my-customer";

export type SalesStore = { id: string; business_name: string; contact_name?: string | null | undefined; mobile?: string | null | undefined; city?: string | null | undefined };
export type SalesInfo = { uid: string; isSales: boolean; picked: SalesStore | null };

let info: SalesInfo | null = null;
let pending: Promise<SalesInfo> | null = null;
let pendingUid: string | null = null;
let generation = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function save(v: SalesInfo | null) {
  info = v;
  emit();
}

/** Only the current session's successful RPC response enables sales controls. */
export function parseWhoami(uid: string, w: unknown): SalesInfo {
  const o = (w ?? {}) as { is_sales?: boolean; own_customer_login?: boolean; picked?: SalesStore | null };
  const isSales = o.is_sales === true;
  return { uid, isSales, picked: isSales ? o.picked ?? null : null };
}

/** Cached sales state; re-reads from the server on first use per user. */
export async function getSalesInfo(uid: string, force = false): Promise<SalesInfo> {
  if (pending && pendingUid === uid) return pending;
  if (!force && info?.uid === uid) return info;
  save(null);
  const version = ++generation;
  pendingUid = uid;
  pending = (async () => {
    let value = parseWhoami(uid, null);
    try {
      const { data, error } = await supabase.rpc("sales_whoami");
      if (!error) value = parseWhoami(uid, data);
    } catch { /* Fail closed, including rejected network requests. */ }
    if (version === generation) save(value);
    return value;
  })();
  try { return await pending; }
  finally { if (version === generation) { pending = null; pendingUid = null; } }
}

export async function pickStore(uid: string, id: string | null): Promise<void> {
  const { data, error } = await supabase.rpc("sales_pick_customer", { p_customer_id: id as string });
  if (error) throw error;
  clearMyCustomer();
  clearUserCaches();
  const d = data as { picked: string | null } & Partial<SalesStore>;
  save({ uid, isSales: true, picked: id && d?.picked ? { id, business_name: d.business_name ?? "", contact_name: d.contact_name, mobile: d.mobile, city: d.city } : null });
  requestDataRefresh();
}

/** Call before sign-out: clears the picked store on the server and locally. */
export async function clearSales(): Promise<void> {
  generation++;
  pending = null;
  pendingUid = null;
  if (info?.isSales) {
    try {
      await supabase.rpc("sales_pick_customer", { p_customer_id: null as unknown as string });
    } catch {
      /* ignore */
    }
  }
  save(null);
}

export function useSales(): SalesInfo | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => info,
    () => null,
  );
}

/** Screens a salesman must not open. */
export const SALES_HIDDEN = ["/registration", "/devices", "/under-review"];
