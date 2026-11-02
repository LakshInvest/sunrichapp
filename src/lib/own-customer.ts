import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches no row: used when the caller has no customer yet. */
const NONE = "00000000-0000-0000-0000-000000000000";

/**
 * The caller's own customers.id, read through their own session (server fns).
 * Staff who are also customers see every row through RLS, so server reads
 * filter explicitly by this id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ownCid(sb: SupabaseClient<any>): Promise<string> {
  const { data } = await sb.rpc("my_customer_id");
  return (data as string | null) ?? NONE;
}
