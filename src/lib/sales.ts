import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearMyCustomer } from "@/lib/my-customer";

export type SalesStore = { id: string; business_name: string; contact_name?: string | null | undefined; mobile?: string | null | undefined; city?: string | null | undefined };
export type SalesInfo = { uid: string; isSales: boolean; picked: SalesStore | null };

const KEY = "sunrich.sales";
let info: SalesInfo | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function load(uid: string): SalesInfo | null {
  if (info?.uid === uid) return info;
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as SalesInfo) : null;
    if (v?.uid === uid) info = v;
  } catch {
    /* ignore */
  }
  return info?.uid === uid ? info : null;
}

function save(v: SalesInfo | null) {
  info = v;
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** A user is in sales mode when sales_whoami says is_sales and they have no own customer login. */
export function parseWhoami(uid: string, w: unknown): SalesInfo {
  const o = (w ?? {}) as { is_sales?: boolean; own_customer_login?: boolean; picked?: SalesStore | null };
  return { uid, isSales: !!o.is_sales && !o.own_customer_login, picked: o.picked ?? null };
}

/** Cached sales state; re-reads from the server on first use per user. */
export async function getSalesInfo(uid: string): Promise<SalesInfo> {
  const cached = load(uid);
  const fresh = Promise.resolve(supabase.rpc("sales_whoami")).then(({ data, error }) => {
    if (error) return cached ?? { uid, isSales: false, picked: null };
    const v = parseWhoami(uid, data);
    save(v);
    return v;
  });
  return cached ?? fresh;
}

export async function pickStore(uid: string, id: string | null): Promise<void> {
  const { data, error } = await supabase.rpc("sales_pick_customer", { p_customer_id: id as string });
  if (error) throw error;
  clearMyCustomer();
  const d = data as { picked: string | null } & Partial<SalesStore>;
  save({ uid, isSales: true, picked: id && d?.picked ? { id, business_name: d.business_name ?? "", contact_name: d.contact_name, mobile: d.mobile, city: d.city } : null });
}

/** Call before sign-out: clears the picked store on the server and locally. */
export async function clearSales(): Promise<void> {
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
