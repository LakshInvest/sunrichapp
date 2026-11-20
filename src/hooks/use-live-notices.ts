import { useEffect } from "react";
import { toast } from "sonner";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/catalogue";
import { emitNoticeArrived, noticeKey, noticeVars } from "@/lib/app-notices";

/** Realtime INSERT on notification_log (RLS limits rows to this customer) → toast + bell refresh. */
export function useLiveNotices() {
  useEffect(() => {
    const ch = supabase
      .channel("my-notices")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_log" }, (payload) => {
        const row = payload.new as { event_key?: string; payload?: Record<string, unknown> | null; channel?: string };
        if (row.channel && row.channel !== "app") return;
        const key = noticeKey(row.event_key ?? "");
        const vars = noticeVars(row.payload ?? {}, i18n.language === "en" ? "en-IN" : `${i18n.language}-IN`, formatINR);
        toast(i18n.t(`appNotice.${key}.title`), { description: i18n.t(`appNotice.${key}.line`, vars) });
        emitNoticeArrived();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);
}
