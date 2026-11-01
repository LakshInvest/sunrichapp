import i18n from "@/lib/i18n";

/** Scrolls to and focuses the first visible field error (elements marked data-field-error). Browser-only. */
export function scrollToFirstError(): void {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>("[data-field-error]");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = el.closest("label, [data-field]")?.querySelector<HTMLElement>("input, textarea, select, button");
    field?.focus({ preventScroll: true });
  });
}

/**
 * Central user-facing error handler. Never shows raw Supabase/JS/HTTP text:
 * network problems map to "please check your internet connection", anything
 * technical (RLS/permission, PostgREST codes, stack traces, null/undefined)
 * maps to "something went wrong, please try again". Human server messages
 * (e.g. "Location is required") pass through, or the localized fallback is
 * used. The real error always goes to the console for us.
 */
const NETWORK_RE = /failed to fetch|load failed|networkerror|network request failed|fetch failed|internet|offline|timed?\s?out|econn|enotfound|dns/i;
const TECHNICAL_RE = /pgrst|pgcode|42501|permission denied|row-level|violates|jwt|api key|schema cache|relation|column|duplicate key|stack|traceback|\bnull\b|\bundefined\b|\bhttp \d|\b50[0-9]\b|\b40[0-9]\b|postgres|sqlstate|supabase/i;

export function serverMessage(e: unknown, fallback: string): string {
  const raw = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message ?? "").trim() : "";
  if (raw) console.error("[sunrich] server error:", raw, e);
  if (!raw) return fallback;
  if (NETWORK_RE.test(raw)) return i18n.t("errors.network");
  if (TECHNICAL_RE.test(raw)) return fallback; // localized, friendly fallback wins over raw text
  if (raw.length > 120) return fallback; // long diagnostics are not user text
  return raw;
}
