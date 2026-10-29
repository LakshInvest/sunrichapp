import { useTranslation } from "react-i18next";
import { queryChipKey } from "@/lib/query-status";
import { cn } from "@/lib/utils";

/** Status chip for a customer query: open / answered / closed. */
export function QueryChip({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  const key = queryChipKey(status);
  const styles =
    key === "open"
      ? "bg-destructive/10 text-destructive"
      : key === "answered"
        ? "bg-secondary/15 text-secondary"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        styles,
        className,
      )}
    >
      {t(`queries.chip${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
    </span>
  );
}
