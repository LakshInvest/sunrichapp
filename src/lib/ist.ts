/** IST (Asia/Kolkata) day helpers — the single source of "today" and day boundaries.
 *  India has no DST, so the +05:30 offset is fixed; a payment or bill stamped
 *  after midnight IST belongs to that IST calendar day, never the previous UTC day. */
export const IST_TZ = "Asia/Kolkata";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const partFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: IST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** "YYYY-MM-DD" for right now in IST. */
export function istToday(now = new Date()): string {
  return dayFmt.format(now);
}

/** "YYYY-MM" for right now in IST. */
export function istMonth(now = new Date()): string {
  return istToday(now).slice(0, 7);
}

/** The IST calendar day ("YYYY-MM-DD") of a timestamp; date-only strings pass through. */
export function istDayOf(iso: string, now = new Date()): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dayFmt.format(d);
}

/** Midnight IST of a calendar day, as a UTC instant (00:00 IST = 18:30 UTC the day before). */
export function istDayStart(day: string, _now = new Date()): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 5.5 * 3600_000).toISOString();
}

/** Last millisecond of an IST day, as a UTC instant. */
export function istDayEnd(day: string, _now = new Date()): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000 - 5.5 * 3600_000 - 1).toISOString();
}

/** Add days to a "YYYY-MM-DD" string (calendar arithmetic, no timezones involved). */
export function istShiftDay(day: string, by: number): string {
  const d = new Date(Date.parse(`${day}T00:00:00Z`) + by * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Parts of an instant in IST: { y, m, d } numbers (1-based). */
export function istParts(d: Date): { y: number; m: number; d: number } {
  const p = partFmt.formatToParts(d);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}
