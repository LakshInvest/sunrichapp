import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Clears the signed-in user's profile photo.
 *
 * The update_my_profile RPC keeps the old value when p_photo_url is null
 * (coalesce), so removing a photo needs this dedicated server function.
 * RLS has no own-update policy on user_profiles (only admins may update),
 * so the service role is used, scoped strictly to the caller's own id.
 */
export const clearMyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({ photo_url: null })
      .eq("id", context.userId);
    if (error) return { ok: false };
    return { ok: true };
  });
