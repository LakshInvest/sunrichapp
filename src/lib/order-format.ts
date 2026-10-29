import { useLang } from "@/hooks/use-lang";

/** Status chip colors shared by the order list, detail and payments screens. */
export function statusChipClass(status: string): string {
  if (status === "delivered" || status === "closed" || status === "approved") return "bg-secondary/15 text-primary";
  if (status === "cancelled" || status === "rejected") return "bg-destructive/10 text-destructive";
  if (status === "credit_hold") return "bg-accent/15 text-accent-foreground";
  return "bg-muted text-foreground";
}

/** Short date label in the user's language (e.g. "29 Oct"). */
export function dateLabel(iso: string | null, lang: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(lang === "en" ? "en-IN" : lang === "hi" ? "hi-IN" : "mr-IN", {
    day: "numeric",
    month: "short",
  });
}

export function useOrderLabels() {
  const { lang } = useLang();
  return { statusChipClass, dateLabel: (iso: string | null) => dateLabel(iso, lang) };
}
