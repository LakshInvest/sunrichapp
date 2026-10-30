import i18n from "@/lib/i18n";
import { useLang } from "@/hooks/use-lang";

/** Status chip colors shared by the order list, detail and payments screens. */
export function statusChipClass(status: string): string {
  if (status === "delivered" || status === "closed" || status === "approved") return "bg-secondary/15 text-primary";
  if (status === "cancelled" || status === "rejected") return "bg-destructive/10 text-destructive";
  if (status === "credit_hold") return "bg-accent/15 text-accent-foreground";
  return "bg-muted text-foreground";
}

const locale = (lang: string) => (lang === "en" ? "en-IN" : lang === "hi" ? "hi-IN" : "mr-IN");
const pad = (v: number) => String(v).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Which friendly word a date gets: today / tomorrow / yesterday, or a plain date. */
export function relativeDay(iso: string, now = new Date()): "today" | "tomorrow" | "yesterday" | null {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  const k = dayKey(d);
  const shift = (n: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() + n);
    return dayKey(x);
  };
  if (k === shift(0)) return "today";
  if (k === shift(1)) return "tomorrow";
  if (k === shift(-1)) return "yesterday";
  return null;
}

/** Plain short date: "31 Oct", plus the year only when it is not this year. */
export function shortDate(iso: string, lang: string, now = new Date()): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString(locale(lang), opts);
}

/** Friendly date in the user's language: "Today", "Tomorrow", "31 Oct" (never 2026-10-31). */
export function dateLabel(iso: string | null, lang: string, now = new Date()): string {
  if (!iso) return "—";
  const rel = relativeDay(iso, now);
  if (rel) return i18n.t(`dates.${rel}`, { lng: lang });
  return shortDate(iso, lang, now);
}

/** "Tomorrow, 31 Oct" — relative word plus the date, for delivery lines. */
export function dayAndDate(iso: string | null, lang: string, now = new Date()): string {
  if (!iso) return "—";
  const rel = relativeDay(iso, now);
  const sd = shortDate(iso, lang, now);
  return rel === "tomorrow" ? `${i18n.t("dates.tomorrow", { lng: lang })}, ${sd}` : rel ? i18n.t(`dates.${rel}`, { lng: lang }) : sd;
}

export function useOrderLabels() {
  const { lang } = useLang();
  return { statusChipClass, dateLabel: (iso: string | null) => dateLabel(iso, lang) };
}
