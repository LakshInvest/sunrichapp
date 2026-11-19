import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ownCustomerFilter } from "@/lib/my-customer";
import type { Scheme } from "@/lib/scheme-rules";

export const schemesQuery = queryOptions({
  queryKey: ["customer-schemes"], staleTime: 60_000,
  queryFn: async (): Promise<Scheme[]> => {
    // Include the customer identity in the response and never reuse another customer's rows.
    const cid = await ownCustomerFilter();
    const { data, error } = await supabase.rpc("my_schemes");
    if (error) { console.error("my_schemes", error); throw error; }
    if (cid !== await ownCustomerFilter()) return [];
    const rows = Array.isArray(data) ? data : [];
    return rows.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as unknown as Scheme[];
  },
});
export function useSchemes() {
  const [cid, setCid] = useState<string | null>(null);
  useEffect(() => { let live = true; void ownCustomerFilter().then((id) => { if (live) setCid(id); }); return () => { live = false; }; }, []);
  return useQuery({ ...schemesQuery, queryKey: ["customer-schemes", cid ?? ""], enabled: !!cid, refetchOnMount: "always", refetchOnWindowFocus: "always", refetchOnReconnect: "always" });
}