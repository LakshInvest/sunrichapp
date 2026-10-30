import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { formatINR } from "@/lib/catalogue";
import { dateLabel } from "@/lib/order-format";
import type { Balance } from "@/lib/ledger";

export function BalanceCard({ bal, compact }: { bal: Balance | null; compact?: boolean }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  if (!bal)
    return <div className="h-36 animate-pulse rounded-2xl bg-muted" aria-busy aria-label={t("common.loading")} />;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Wallet className="h-4 w-4 text-secondary" aria-hidden /> {t("balance.title")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{t("balance.outstanding")}</p>
      <p className="text-2xl font-extrabold text-primary">{formatINR(bal.outstanding)}</p>
      {bal.overdue > 0 && (
        <p className="mt-1 text-sm font-semibold text-destructive">
          {t("balance.overdue", { amount: formatINR(bal.overdue), days: bal.overdueDays })}
        </p>
      )}
      {!compact && (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("balance.limit")}</dt>
            <dd className="font-semibold">{bal.limit > 0 ? formatINR(bal.limit) : t("balance.noCredit")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("balance.available")}</dt>
            <dd className="font-semibold text-primary">{bal.limit > 0 ? formatINR(bal.available) : "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">{t("balance.nextDue")}</dt>
            <dd className="font-semibold">{bal.nextDue ? dateLabel(bal.nextDue, lang) : t("balance.nothingDue")}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

