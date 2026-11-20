import { createServerFn } from "@tanstack/react-start";
import { brandVisibility } from "./brand-photos";

export type LoginTexts = Partial<Record<"login_title" | "login_subtitle" | "login_tagline" | "pin_title" | "otp_title" | "otp_subtitle", { en: string | null; hi: string | null; mr: string | null }>>;
export type BrandPhotos = { login: string | null; launch: string | null; hero: string | null; logo?: string | null; texts?: LoginTexts; visibility?: ReturnType<typeof brandVisibility> };
const TEXT_KEYS = ["login_title", "login_subtitle", "login_tagline", "pin_title", "otp_title", "otp_subtitle"] as const;
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const url = (v: unknown) => (typeof v === "string" && /^https:\/\//.test(v.trim()) ? v.trim() : null);

/**
 * Public (no sign-in): allowlisted SUNRICH brand images, display flags and login copy only.
 */
export const getBrandPhotos = createServerFn({ method: "GET" }).handler(async (): Promise<BrandPhotos> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin.from("companies").select("id").eq("code", "SUNRICH").maybeSingle();
    if (!company) return { login: null, launch: null, hero: null };
    const [s, h] = await Promise.all([
      supabaseAdmin.from("app_settings").select("*").eq("company_id", company.id).limit(1).maybeSingle(),
      supabaseAdmin.from("app_hero").select("background_image_url").eq("company_id", company.id).limit(1).maybeSingle(),
    ]);
    const sr = (s.data ?? {}) as Record<string, unknown>;
    const texts: LoginTexts = {};
    for (const k of TEXT_KEYS) texts[k] = { en: txt(sr[k]), hi: txt(sr[`${k}_hi`]), mr: txt(sr[`${k}_mr`]) };
    return { login: url(sr["login_image_url"]), launch: url(sr["launch_image_url"]), hero: url(h.data?.background_image_url), logo: url(sr["app_logo_url"]), texts, visibility: brandVisibility(sr) };
  } catch (e) {
    console.warn("brand photos failed", e);
    return { login: null, launch: null, hero: null };
  }
});
