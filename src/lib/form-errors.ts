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
const TECHNICAL_RE = /pgrst|pgcode|42501|permission denied|row-level|violates|jwt|api key|schema cache|relation|column|duplicate key|stack|traceback|\bnull\b|\bundefined\b|\bhttp \d|\b50[0-9]\b|\b40[0-9]\b|postgres|sqlstate|supabase|invalid input syntax|invalid text representation|\buuid\b|\bsyntax error\b/i;
/** The pricing engine rejects unpriced lines ("No price set for <name>") — always show the friendly price message. */
const NO_PRICE_RE = /^no price set for /i;

/** Known payment-report rejections retain their reason without exposing database wording. */
export function paymentReportReason(e: unknown): "dailyLimit" | "duplicate" | "amount" | "reference" | "date" | "proof" | "cash" | "cheque" | "method" | null {
  const raw = e && typeof e === "object" && "message" in e ? String(e.message) : "";
  if (/too many payment reports|payment.*(?:daily|today).*limit|daily.*payment.*limit/i.test(raw)) return "dailyLimit";
  if (/payment is already reported|already.*(?:reported|reference|utr)|duplicate.*(?:payment|reference|utr)/i.test(raw)) return "duplicate";
  if (/amount must be|invalid amount|amount.*(?:positive|greater than zero|more than zero)/i.test(raw)) return "amount";
  if (/payment date.*future/i.test(raw)) return "date";
  if (/add the utr.*screenshot/i.test(raw)) return "proof";
  if (/choose who.*cash/i.test(raw)) return "cash";
  if (/enter the cheque number/i.test(raw)) return "cheque";
  if (/choose how you paid/i.test(raw)) return "method";
  if (/(?:invalid|12 digits|twelve digits).*(?:utr|reference)|(?:utr|reference).*(?:invalid|12 digits|twelve digits)/i.test(raw)) return "reference";
  return null;
}

export function paymentReportMessage(e: unknown): string {
  const reason = paymentReportReason(e);
  if (reason) {
    console.error("[sunrich] payment report error:", e);
    return i18n.t(`paymentReport.${reason}`);
  }
  // Keep network recovery, but never display an untranslated unknown payment diagnostic.
  const raw = e && typeof e === "object" && "message" in e ? String(e.message) : "";
  console.error("[sunrich] payment report error:", e);
  return NETWORK_RE.test(raw) ? i18n.t("errors.network") : i18n.t("paymentReport.failed");
}

export function serverMessage(e: unknown, fallback: string): string {
  const raw = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message ?? "").trim() : "";
  if (raw) console.error("[sunrich] server error:", raw, e);
  if (!raw) return fallback;
  if (NETWORK_RE.test(raw)) return i18n.t("errors.network");
  if (NO_PRICE_RE.test(raw)) return i18n.t("errors.noPrice");
  if (TECHNICAL_RE.test(raw)) return fallback; // localized, friendly fallback wins over raw text
  if (raw.length > 120) return fallback; // long diagnostics are not user text
  return raw;
}
