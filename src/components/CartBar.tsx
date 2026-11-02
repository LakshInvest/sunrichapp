import { ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Floating "cart bar" shown above the bottom nav whenever the cart has items.
 * Shared by Home and Shop. Hidden automatically when the cart is empty.
 */
export function CartBar({
  count,
  total,
  pending,
  onOpen,
  onClear,
}: {
  count: number;
  total: string;
  pending: boolean;
  onOpen: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4">
      <div className="relative mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl shadow-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          type="button"
          aria-label={t("cart.clear")}
          onClick={onClear}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition active:scale-90"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p className="text-sm font-semibold">{t("cart.itemsSummary", { count, total })}</p>
        {pending ? (
          <span className="flex min-h-11 items-center rounded-xl bg-primary-foreground/15 px-4 text-center text-sm font-bold text-primary-foreground">
            {t("cart.orderingAfterApproval")}
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-4 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            {t("cart.viewCart")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
