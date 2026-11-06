import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Command Center app settings (public.app_settings, one row per company).
 * Loaded once after login, cached in localStorage, refreshed on app resume
 * and pull-to-refresh. Pure rule helpers below are unit-tested.
 */

export type DeliverySlot = {
  code: string;
  name: string;
  name_hi: string | null;
  name_mr: string | null;
  from: string; // "HH:MM"
  to: string;
  active: boolean;
};

export type AppSettings = {
  deliveryDaysAhead: number;
  sameDayCutoff: string; // "HH:MM[:SS]"
  slots: DeliverySlot[];
  closedWeekdays: number[];
  holidays: string[];
  minOrderValue: number;
  allowOrderNotes: boolean;
  allowCancelBefore: string;
  supportPhone: string | null;
  supportWhatsapp: string | null;
  supportEmail: string | null;
  supportHours: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  about: { en: string; hi: string | null; mr: string | null };
  feedbackEnabled: boolean;
  showJarBalance: boolean;
  multipleAddresses: boolean;
  plantAddress: string | null;
  pickupHours: string | null;
  launchImageUrl: string | null;
  loginImageUrl: string | null;
  allCategoryImageUrl: string | null;
};

const KEY = "sunrich.appSettings.v1";
const blank = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

export function mapSettings(r: Record<string, unknown>): AppSettings {
  const slots = Array.isArray(r["delivery_slots"]) ? (r["delivery_slots"] as Record<string, unknown>[]) : [];
  return {
    deliveryDaysAhead: Number(r["delivery_days_ahead"] ?? 6),
    sameDayCutoff: String(r["same_day_cutoff"] ?? "23:59"),
    slots: slots.map((s) => ({
      code: String(s["code"] ?? s["name"] ?? ""),
      name: String(s["name"] ?? ""),
      name_hi: blank(s["name_hi"]),
      name_mr: blank(s["name_mr"]),
      from: String(s["from"] ?? "00:00"),
      to: String(s["to"] ?? "23:59"),
      active: s["active"] !== false,
    })),
    closedWeekdays: Array.isArray(r["closed_weekdays"]) ? (r["closed_weekdays"] as number[]).map(Number) : [],
    holidays: Array.isArray(r["holidays"]) ? (r["holidays"] as string[]).map(String) : [],
    minOrderValue: Number(r["min_order_value"] ?? 0),
    allowOrderNotes: Boolean(r["allow_order_notes"]),
    allowCancelBefore: String(r["allow_cancel_before"] ?? "placed"),
    supportPhone: blank(r["support_phone"]),
    supportWhatsapp: blank(r["support_whatsapp"]),
    supportEmail: blank(r["support_email"]),
    supportHours: blank(r["support_hours"]),
    privacyUrl: blank(r["privacy_url"]),
    termsUrl: blank(r["terms_url"]),
    about: { en: blank(r["about_text"]) ?? "", hi: blank(r["about_text_hi"]), mr: blank(r["about_text_mr"]) },
    feedbackEnabled: Boolean(r["feedback_enabled"]),
    showJarBalance: Boolean(r["show_jar_balance"]),
    multipleAddresses: r["multiple_addresses"] !== false,
    plantAddress: blank(r["plant_address"]),
    pickupHours: blank(r["pickup_hours"]),
    launchImageUrl: blank(r["launch_image_url"]),
    loginImageUrl: blank(r["login_image_url"]),
    allCategoryImageUrl: blank(r["all_category_image_url"]),
  };
}

export function readSettingsCache(): AppSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : null;
  } catch {
    return null;
  }
}

let inflight: Promise<AppSettings | null> | null = null;
const listeners = new Set<(s: AppSettings) => void>();

export function refreshAppSettings(): Promise<AppSettings | null> {
  inflight ??= (async () => {
    try {
      const { data: companyId } = await supabase.rpc("my_company_id");
      let q = supabase.from("app_settings").select("*");
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q.limit(1).maybeSingle();
      if (error || !data) return readSettingsCache();
      const s = mapSettings(data as Record<string, unknown>);
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
        // Read before JS loads (inline script in the page shell) and on the signed-out login.
        for (const [k, v] of [["sunrich.launchImg", s.launchImageUrl], ["sunrich.loginImg", s.loginImageUrl]] as const) {
          if (v) localStorage.setItem(k, v);
          else localStorage.removeItem(k);
        }
      } catch {
        /* best effort */
      }
      listeners.forEach((l) => l(s));
      return s;
    } catch {
      return readSettingsCache();
    } finally {
      setTimeout(() => (inflight = null), 0);
    }
  })();
  return inflight;
}

let loadedThisSession = false;

/** Cached settings instantly; network refresh once per session and on resume. */
export function useAppSettings(): AppSettings | null {
  const [s, setS] = useState<AppSettings | null>(null);
  useEffect(() => {
    setS(readSettingsCache());
    listeners.add(setS);
    if (!loadedThisSession) {
      loadedThisSession = true;
      void refreshAppSettings();
    }
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshAppSettings();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      listeners.delete(setS);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return s;
}

/* ---------- pure rules ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export type DeliveryDay = { iso: string; date: Date; closed: boolean; isToday: boolean };

/** Today … today + daysAhead. Today dropped after the cutoff; closed weekdays/holidays flagged. */
export function deliveryDays(s: Pick<AppSettings, "deliveryDaysAhead" | "sameDayCutoff" | "closedWeekdays" | "holidays">, now: Date): DeliveryDay[] {
  const out: DeliveryDay[] = [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i <= Math.max(0, s.deliveryDaysAhead); i++) {
    if (i === 0 && nowMin >= minutes(s.sameDayCutoff)) continue;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = isoLocal(d);
    out.push({ iso, date: d, isToday: i === 0, closed: s.closedWeekdays.includes(d.getDay()) || s.holidays.includes(iso) });
  }
  return out;
}

/** Active slots; on today, slots that already started are disabled. */
export function slotsFor(s: Pick<AppSettings, "slots">, dayIso: string, now: Date) {
  const today = isoLocal(now) === dayIso;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return s.slots
    .filter((x) => x.active)
    .map((x) => ({ ...x, disabled: today && minutes(x.from) <= nowMin }));
}

export function slotName(x: DeliverySlot, lang: string): string {
  if (lang === "hi") return x.name_hi || x.name;
  if (lang === "mr") return x.name_mr || x.name;
  return x.name;
}

/** Localise a stored order slot (code or any-language name) using the configured slots. */
export function localSlot(stored: string | null | undefined, slots: DeliverySlot[] | undefined, lang: string): string {
  if (!stored) return "";
  const v = stored.trim().toLowerCase();
  const x = (slots ?? []).find((y) =>
    [y.code, y.name, y.name_hi, y.name_mr].some((n) => (n ?? "").trim().toLowerCase() === v),
  );
  return x ? slotName(x, lang) : stored;
}

/** Amount still needed to reach the minimum order, 0 when met. */
export function minOrderShortfall(total: number, minOrderValue: number): number {
  return minOrderValue > 0 && total < minOrderValue ? Math.round((minOrderValue - total) * 100) / 100 : 0;
}

const CANCEL_ORDER = ["placed", "credit_hold", "approved", "processing"];
/** Customer may cancel while status is at or before allow_cancel_before. */
export function canCustomerCancel(status: string, allowCancelBefore: string): boolean {
  const limit = CANCEL_ORDER.indexOf(allowCancelBefore === "placed" ? "credit_hold" : allowCancelBefore);
  const at = CANCEL_ORDER.indexOf(status);
  return at !== -1 && limit !== -1 && at <= limit;
}

/** wa.me link with digits only (adds 91 for 10-digit Indian numbers). */
export function waLink(number: string, text: string): string {
  let d = number.replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
