import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { formatINR } from "@/lib/catalogue";
import { dateLabel } from "@/lib/order-format";
import { balanceTone, type KhataSummary } from "@/lib/khata";

/** Big Khata balance: "₹X due" (red), "₹X advance" (green) or "All clear", plus credit facts. */
export function KhataBalanceCard({ sum, compact }: { sum: KhataSummary | null; compact?: boolean }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  if (!sum) return <div className="h-36 animate-pulse rounded-2xl bg-muted" aria-busy aria-label={t("common.loading")} />;
  const tone = balanceTone(sum.balance);
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm" data-testid="khata-balance">
      <p className="text-sm font-bold text-muted-foreground">{t("khata.title")}</p>
      {tone === "due" && <p className="mt-1 text-3xl font-extrabold text-destructive">{t("khata.due", { amount: formatINR(sum.balance) })}</p>}
      {tone === "advance" && <p className="mt-1 text-3xl font-extrabold text-success">{t("khata.advance", { amount: formatINR(-sum.balance) })}</p>}
      {tone === "clear" && (
        <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold text-primary">
          <CheckCircle2 className="h-7 w-7 text-success" aria-hidden /> {t("khata.allClear")}
        </p>
      )}
      {!compact && (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("khata.creditLimit")}</dt>
            <dd className="font-semibold">{sum.creditLimit > 0 ? formatINR(sum.creditLimit) : t("khata.noCredit")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("khata.available")}</dt>
            <dd className="font-semibold text-primary">{sum.creditLimit > 0 ? formatINR(sum.available) : "—"}</dd>
          </div>
          {sum.overdue > 0 && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("khata.overdue")}</dt>
              <dd className="font-semibold text-destructive">{formatINR(sum.overdue)}</dd>
            </div>
          )}
          {sum.oldestUnpaid && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("khata.oldestBill")}</dt>
              <dd className="font-semibold">{dateLabel(sum.oldestUnpaid, lang)}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
