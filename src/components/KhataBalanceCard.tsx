import { useTranslation } from "react-i18next";
import { formatINR } from "@/lib/catalogue";
import { balanceTone, type KhataSummary } from "@/lib/khata";

/** Khata top: "Your balance ₹X" (red) + overdue, "₹X advance" (green) or "All clear ✓". Never the credit limit. */
export function KhataBalanceCard({ sum }: { sum: KhataSummary | null; compact?: boolean }) {
  const { t } = useTranslation();
  if (!sum) return <div className="h-24 animate-pulse rounded-2xl bg-muted" aria-busy aria-label={t("common.loading")} />;
  const tone = balanceTone(sum.balance);
  return (
    <section className="py-2" data-testid="khata-balance">
      {tone === "due" && (
        <>
          <p className="text-sm text-muted-foreground">{t("khata2.yourBalance")}</p>
          <p className="text-4xl font-extrabold tracking-tight text-destructive">{formatINR(sum.balance)}</p>
          {sum.overdue > 0 && <p className="mt-1 text-sm font-semibold text-destructive/80">{t("khata2.overdue", { amount: formatINR(sum.overdue) })}</p>}
        </>
      )}
      {tone === "advance" && (
        <>
          <p className="text-4xl font-extrabold tracking-tight text-success">{t("khata2.advance", { amount: formatINR(-sum.balance) })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("khata2.advanceNote")}</p>
        </>
      )}
      {tone === "clear" && <p className="text-4xl font-extrabold tracking-tight text-success">{t("khata2.allClear")}</p>}
    </section>
  );
}
