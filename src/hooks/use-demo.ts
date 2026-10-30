import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** True when the signed-in profile is a store-reviewer demo account (user_profiles.is_demo). */
export function useIsDemo(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("user_profiles").select("is_demo").eq("id", uid).maybeSingle();
      if (active) setDemo(Boolean(data?.is_demo));
    })();
    return () => {
      active = false;
    };
  }, []);
  return demo;
}
