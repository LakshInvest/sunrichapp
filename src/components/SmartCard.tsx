import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { formatINR } from "@/lib/catalogue";
import type { OrderDto } from "@/lib/orders";
import { pickSmartCard, readDismissed, writeDismissed } from "@/lib/smart-card";

/** One card under the search: overdue → out for delivery → reorder last delivery. Never shows order numbers. */
export function SmartCard({
  overdue,
  outForDelivery,
  lastDelivered,
  thumb,
  onPay,
  onTrack,
  onReorder,
}: {
  overdue: number;
  outForDelivery: OrderDto | null;
  lastDelivered: OrderDto | null;
  thumb: (productId: string) => string | null;
  onPay: () => void;
  onTrack: (id: string) => void;
  onReorder: () => void;
}) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => readDismissed());
  const pick = pickSmartCard(
    { overdue, dispatchedId: outForDelivery?.id ?? null, lastDeliveredId: lastDelivered?.id ?? null },
    dismissed,
  );
  if (!pick) return null;
  const close = () => {
    writeDismissed(pick.sig);
    setDismissed(pick.sig);
  };
  const first = lastDelivered?.lines[0];
  return (
    <div className="relative mx-5 mb-2 mt-3 flex min-h-16 items-center gap-3 rounded-2xl bg-card p-3 pr-10 shadow-sm" data-testid={`smart-${pick.kind}`}>
      {pick.kind === "reorder" && first && (
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          <SmartImage width={48} src={thumb(first.productId)} alt="" className="h-12 w-12 object-contain p-1" />
        </span>
      )}
      <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
        {pick.kind === "overdue" && <span className="text-destructive">{t("smart.overdue", { amount: formatINR(overdue) })}</span>}
        {pick.kind === "dispatched" && t("smart.dispatched")}
        {pick.kind === "reorder" && lastDelivered && (
          <span className="block truncate">
            {lastDelivered.lines.map((l) => `${l.packLabel ?? l.productName} × ${l.qty}`).join(", ")} · {formatINR(lastDelivered.grandTotal)}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={() => (pick.kind === "overdue" ? onPay() : pick.kind === "dispatched" ? outForDelivery && onTrack(outForDelivery.id) : onReorder())}
        className="min-h-10 shrink-0 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground"
      >
        {t(pick.kind === "overdue" ? "smart.pay" : pick.kind === "dispatched" ? "smart.track" : "smart.reorder")}
      </button>
      <button type="button" onClick={close} aria-label={t("smart.dismiss")} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center text-muted-foreground">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
