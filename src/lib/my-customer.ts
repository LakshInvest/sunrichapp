import { supabase } from "@/integrations/supabase/client";

/**
 * The signed-in user's own customers.id. Staff accounts that are also
 * customers see every row through RLS, so every customer-side read filters
 * explicitly by this id. Cached per signed-in user.
 */
let cache: { uid: string; cid: Promise<string | null> } | null = null;

/** Matches no row: used when the user has no customer yet. */
export const NO_CUSTOMER = "00000000-0000-0000-0000-000000000000";

export async function getMyCustomerId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return null;
  if (cache?.uid !== uid) {
    const cid = Promise.resolve(supabase.rpc("my_customer_id")).then(({ data: id, error }) => {
      if (error) {
        cache = null; // retry next time
        return null;
      }
      return (id as string | null) ?? null;
    });
    cache = { uid, cid };
  }
  const cid = await cache.cid;
  if (!cid && cache?.uid === uid) cache = null; // registration may finish later
  return cid;
}

/** Own customer id, or an id that matches nothing. Use in `.eq("customer_id", …)`. */
export async function ownCustomerFilter(): Promise<string> {
  return (await getMyCustomerId()) ?? NO_CUSTOMER;
}

export function clearMyCustomer() {
  cache = null;
}
