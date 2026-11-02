import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IndianRupee } from "lucide-react";
import { formatINR, getHomeExtras, onHomeExtras } from "@/lib/catalogue";
import { fetchKhataSummary } from "@/lib/khata";

/** Home strip "₹X overdue · Pay" — only when the Khata shows an overdue amount. */
export function KhataPayShortcut() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [overdue, setOverdue] = useState(0);
  useEffect(() => {
    // Home's get_home() already carries the Khata summary; fetch only when
    // Home was served from cache without a network call.
    const pick = (k: Record<string, unknown> | null) => setOverdue(Number(k?.["overdue"] ?? 0) || 0);
    const off = onHomeExtras((x) => pick(x.khata));
    const x = getHomeExtras();
    if (x) pick(x.khata);
    const id = x
      ? undefined
      : setTimeout(() => {
          if (!getHomeExtras()) fetchKhataSummary().then((s) => setOverdue(s.overdue), () => setOverdue(0));
        }, 2500);
    return () => {
      if (id) clearTimeout(id);
      off();
    };
  }, []);
  if (!(overdue > 0)) return null;
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/khata/pay" })}
      data-testid="home-khata-pay"
      className="flex min-h-11 w-full items-center gap-2 bg-destructive/10 px-5 py-2 text-left text-sm font-semibold text-destructive"
    >
      <IndianRupee className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{t("khata.homePay", { amount: formatINR(overdue) })}</span>
      <span className="shrink-0 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">{t("khata.payNow")}</span>
    </button>
  );
}
