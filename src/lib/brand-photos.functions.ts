import { createServerFn } from "@tanstack/react-start";

export type BrandPhotos = { login: string | null; launch: string | null; hero: string | null };

const url = (v: unknown) => (typeof v === "string" && /^https:\/\//.test(v.trim()) ? v.trim() : null);

/**
 * Public (no sign-in): only the SUNRICH brand photo URLs for the login and launch screens.
 * Returns nothing else; these images are already public in storage.
 */
export const getBrandPhotos = createServerFn({ method: "GET" }).handler(async (): Promise<BrandPhotos> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin.from("companies").select("id").eq("code", "SUNRICH").maybeSingle();
    if (!company) return { login: null, launch: null, hero: null };
    const [s, h] = await Promise.all([
      supabaseAdmin.from("app_settings").select("login_image_url, launch_image_url").eq("company_id", company.id).limit(1).maybeSingle(),
      supabaseAdmin.from("app_hero").select("background_image_url").eq("company_id", company.id).limit(1).maybeSingle(),
    ]);
    const sr = (s.data ?? {}) as Record<string, unknown>;
    return { login: url(sr["login_image_url"]), launch: url(sr["launch_image_url"]), hero: url(h.data?.background_image_url) };
  } catch (e) {
    console.warn("brand photos failed", e);
    return { login: null, launch: null, hero: null };
  }
});
