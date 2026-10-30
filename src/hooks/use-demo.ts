import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyCustomerId } from "@/lib/orders";

/** True only when the signed-in customer is the store-reviewer demo shop (customers.is_demo). */
export function useIsDemo(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const cid = await getMyCustomerId();
      if (!cid) return;
      const { data } = await supabase.from("customers").select("is_demo").eq("id", cid).maybeSingle();
      if (active) setDemo(Boolean(data?.is_demo));
    })();
    return () => {
      active = false;
    };
  }, []);
  return demo;
}
