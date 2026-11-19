import { Phone, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { callHref, showOnTheWay, type OrderDispatch } from "@/lib/dispatch";
import { indDateTime } from "@/lib/order-format";

/** "Who is bringing my order" — own vehicles and transporters alike. */
export function OnTheWayCard({ d, lang }: { d: OrderDispatch | null; lang: string }) {
  const { t } = useTranslation();
  if (!showOnTheWay(d) || !d) return null;
  const tel = callHref(d);
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm" data-testid="on-the-way">
      <p className="flex items-center gap-2 text-sm font-bold text-secondary"><Truck className="h-4 w-4" aria-hidden /> {t("dispatch.onTheWay")}</p>
      {d.vehicleNo && <p className="mt-2 text-2xl font-extrabold tracking-wide text-primary">{d.vehicleNo}</p>}
      {d.driverName && <p className="mt-1 text-sm text-foreground">{t("dispatch.driver")}: <b>{d.driverName}</b></p>}
      {(d.transporter || d.lrNo) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {d.transporter}{d.transporter && d.lrNo ? " · " : ""}{d.lrNo ? `${t("dispatch.lr")} ${d.lrNo}` : ""}
        </p>
      )}
      {d.dispatchedAt && <p className="mt-1 text-xs text-muted-foreground">{t("dispatch.dispatchedAt", { time: indDateTime(d.dispatchedAt, lang) })}</p>}
      {tel && (
        <a href={tel} data-testid="call-driver" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          <Phone className="h-4 w-4" aria-hidden /> {t("dispatch.call")}
        </a>
      )}
    </section>
  );
}
