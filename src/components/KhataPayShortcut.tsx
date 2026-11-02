import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IndianRupee } from "lucide-react";
import { formatINR, onHomeExtras } from "@/lib/catalogue";
import { fetchKhataSummary, mapKhataSummary } from "@/lib/khata";

/** Home strip "₹X overdue · Pay" — only when the Khata shows an overdue amount. */
export function KhataPayShortcut() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [overdue, setOverdue] = useState(0);
  useEffect(() => {
    // Home's get_home() call carries the Khata summary; fetch only if it never arrives.
    let got = false;
    const off = onHomeExtras((x) => {
      got = true;
      setOverdue(x.khata ? mapKhataSummary(x.khata).overdue : 0);
    });
    const timer = setTimeout(() => {
      if (!got) fetchKhataSummary().then((s) => setOverdue(s.overdue), () => setOverdue(0));
    }, 2500);
    return () => {
      off();
      clearTimeout(timer);
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
