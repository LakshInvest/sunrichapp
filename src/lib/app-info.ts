/** Public app info (no login): legal text, support contacts, versions, maintenance. */
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";

export type AppInfo = {
  company: string;
  address: string;
  supportEmail: string | null;
  supportPhone: string | null;
  supportWhatsapp: string | null;
  privacyMd: string;
  termsMd: string;
  minVersion: string | null;
  latestVersion: string | null;
  playStoreUrl: string | null;
  maintenance: string | null;
};

const s = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

export function mapAppInfo(r: Record<string, unknown>): AppInfo {
  return {
    company: s(r["company"]) ?? "Sunrich",
    address: s(r["address"]) ?? "",
    supportEmail: s(r["support_email"]),
    supportPhone: s(r["support_phone"]),
    supportWhatsapp: s(r["support_whatsapp"]),
    privacyMd: String(r["privacy_md"] ?? ""),
    termsMd: String(r["terms_md"] ?? ""),
    minVersion: s(r["min_app_version"]),
    latestVersion: s(r["latest_app_version"]),
    playStoreUrl: s(r["play_store_url"]),
    maintenance: s(r["maintenance_message"]),
  };
}

let cached: Promise<AppInfo> | null = null;
export function fetchAppInfo(force = false): Promise<AppInfo> {
  if (!cached || force) {
    cached = Promise.resolve(supabase.rpc("public_app_info")).then(({ data, error }) => {
      if (error) {
        cached = null;
        throw new Error(error.message);
      }
      return mapAppInfo((data ?? {}) as Record<string, unknown>);
    });
  }
  return cached;
}

/** -1 a<b, 0 equal, 1 a>b for dotted numeric versions. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export type GateState = "maintenance" | "force_update" | "update_available" | "ok";
export function gateState(info: Pick<AppInfo, "maintenance" | "minVersion" | "latestVersion">, version = APP_VERSION): GateState {
  if (info.maintenance) return "maintenance";
  if (info.minVersion && compareVersions(version, info.minVersion) < 0) return "force_update";
  if (info.latestVersion && compareVersions(version, info.latestVersion) < 0) return "update_available";
  return "ok";
}

/** Fill {{company}}, {{address}}, {{support_email}}, {{support_phone}}. */
export function fillPlaceholders(md: string, info: AppInfo, fallback: string): string {
  const map: Record<string, string> = {
    company: info.company,
    address: info.address || fallback,
    support_email: info.supportEmail ?? fallback,
    support_phone: info.supportPhone ?? info.supportWhatsapp ?? fallback,
  };
  return md.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => map[k] ?? m).replace(/\r\n/g, "\n");
}
