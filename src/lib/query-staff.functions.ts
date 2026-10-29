import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Staff display names for one query thread, keyed by message sender id.
 * Ownership is verified through RLS on customer_queries first; the staff
 * profile names are then read with the service role because customers
 * cannot select other users' profile rows.
 */
export const getStaffNames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ queryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: owned } = await context.supabase
      .from("customer_queries")
      .select("id")
      .eq("id", data.queryId)
      .maybeSingle();
    if (!owned) return {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: msgs } = await supabaseAdmin
      .from("customer_query_messages")
      .select("sender_id")
      .eq("query_id", data.queryId)
      .eq("sender_type", "staff");
    const ids = [...new Set((msgs ?? []).map((m) => m.sender_id).filter((x): x is string => !!x))];
    if (ids.length === 0) return {};

    const { data: staff } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name")
      .in("id", ids);
    return Object.fromEntries((staff ?? []).map((s) => [s.id, s.full_name || "Sunrich"]));
  });
