import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { fetchOrdersAwaitingPayment } from "@/lib/pay-reminder";
import type { OrderDto } from "@/lib/orders";

/** Slim Home reminder: "1 order waiting for payment · Pay now". */
export function PayReminder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [list, setList] = useState<OrderDto[]>([]);
  useEffect(() => {
    fetchOrdersAwaitingPayment().then(setList, () => setList([]));
  }, []);
  if (list.length === 0) return null;
  const go = () =>
    list.length === 1
      ? navigate({ to: "/track/$id", params: { id: list[0]!.id }, search: { pay: 1 } })
      : navigate({ to: "/track" });
  return (
    <button
      type="button"
      onClick={go}
      data-testid="pay-reminder"
      className="flex min-h-11 w-full items-center gap-2 bg-warning/15 px-5 py-2 text-left text-sm font-semibold text-warning-foreground"
    >
      <Wallet className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{t("pay.reminder", { count: list.length })}</span>
      <span className="shrink-0 rounded-full bg-warning px-3 py-1 text-xs font-bold text-primary">{t("pay.payNow")}</span>
    </button>
  );
}
