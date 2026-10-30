import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, KeyRound, Loader2, MapPin, PackageCheck, Ticket } from "lucide-react";
import { fetchAppInfo } from "@/lib/app-info";
import { lineIssues, type DeliveryProof } from "@/lib/delivery";
import { dateLabel } from "@/lib/order-format";
import { canChangeDeliveryMode, setOrderDeliveryMode, type OrderDto } from "@/lib/orders";
import { openExternal } from "@/lib/native";

/** Big delivery code while the order is out for delivery. */
export function DeliveryOtpCard({ otp }: { otp: string }) {
  const { t } = useTranslation();
  return (
    <section className="mt-4 rounded-2xl border-2 border-secondary bg-secondary/10 p-4 text-center" aria-live="polite">
      <p className="flex items-center justify-center gap-2 text-sm font-bold">
        <KeyRound className="h-4 w-4 text-secondary" aria-hidden /> {t("pod.otpTitle")}
      </p>
      <p className="mt-2 font-mono text-4xl font-extrabold tracking-[0.3em] text-primary" aria-label={otp.split("").join(" ")}>
        {otp}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t("pod.otpHint")}</p>
    </section>
  );
}

/** Ordered vs delivered packs per line + issue marks. */
export function DeliveredLines({ order, proof }: { order: OrderDto; proof: DeliveryProof }) {
  const { t } = useTranslation();
  const byLine = new Map(proof.lines.map((l) => [l.orderLineId, l]));
  const empties = proof.lines.reduce((s, l) => s + l.empties, 0);
  if (!proof.lines.length) return null;
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold">
        <PackageCheck className="h-4 w-4 text-secondary" aria-hidden /> {t("pod.deliveredTitle")}
      </p>
      <ul className="mt-3 space-y-3">
        {order.lines.map((ol) => {
          const d = byLine.get(ol.id);
          const issues = d ? lineIssues(d) : [];
          return (
            <li key={ol.id} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="min-w-0 flex-1 truncate">{ol.productName}</span>
                <span className="shrink-0 font-semibold">
                  {t("pod.deliveredOf", { delivered: d?.delivered ?? 0, ordered: ol.qty })}
                </span>
              </div>
              {issues.length > 0 && d && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {issues.map((k) => (
                    <span
                      key={k}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${k === "short" ? "bg-accent/20 text-accent-foreground" : "bg-destructive/10 text-destructive"}`}
                    >
                      {t(`pod.issue.${k}`, { count: k === "short" ? d.short : k === "damaged" ? d.damaged : d.refused })}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {proof.failReason && <p className="mt-3 text-xs text-muted-foreground">{t("pod.reason", { reason: proof.failReason })}</p>}
      {empties > 0 && <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm">{t("pod.empties", { count: empties })}</p>}
    </section>
  );
}

/** Photo, signature, time and who delivered — only what exists. */
export function ProofOfDelivery({ proof }: { proof: DeliveryProof }) {
  const { t, i18n } = useTranslation();
  if (!proof.deliveredAt && !proof.photoUrl && !proof.signatureUrl) return null;
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-bold">{t("pod.title")}</p>
      {proof.otpVerified && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("pod.otpVerified")}
        </p>
      )}
      <dl className="mt-2 space-y-1 text-sm">
        {proof.deliveredAt && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("pod.deliveredAt")}</dt>
            <dd className="font-semibold">
              {dateLabel(proof.deliveredAt, i18n.language)}, {new Date(proof.deliveredAt).toLocaleTimeString(i18n.language === "en" ? "en-IN" : `${i18n.language}-IN`, { hour: "numeric", minute: "2-digit" })}
            </dd>
          </div>
        )}
        {proof.deliveredBy && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("pod.deliveredBy")}</dt>
            <dd className="font-semibold">{proof.deliveredBy}</dd>
          </div>
        )}
      </dl>
      {(proof.photoUrl || proof.signatureUrl) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {proof.photoUrl && (
            <figure>
              <img src={proof.photoUrl} alt={t("pod.photo")} width={320} height={240} className="aspect-[4/3] w-full rounded-xl bg-muted object-cover" />
              <figcaption className="mt-1 text-xs text-muted-foreground">{t("pod.photo")}</figcaption>
            </figure>
          )}
          {proof.signatureUrl && (
            <figure>
              <img src={proof.signatureUrl} alt={t("pod.signature")} width={320} height={240} className="aspect-[4/3] w-full rounded-xl bg-muted object-contain" />
              <figcaption className="mt-1 text-xs text-muted-foreground">{t("pod.signature")}</figcaption>
            </figure>
          )}
        </div>
      )}
    </section>
  );
}

/** Pickup pass: QR of the order number, date, plant address + map, vehicle number. */
export function PickupPass({ order, lang, onChanged, offline }: { order: OrderDto; lang: string; onChanged: () => void; offline: boolean }) {
  const { t } = useTranslation();
  const [plant, setPlant] = useState<{ company: string; address: string } | null>(null);
  const [vehicle, setVehicle] = useState(order.pickupVehicleNo ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchAppInfo().then((i) => setPlant({ company: i.company, address: i.address }), () => setPlant(null));
  }, []);
  useEffect(() => setVehicle(order.pickupVehicleNo ?? ""), [order.pickupVehicleNo]);
  const editable = canChangeDeliveryMode(order.status);
  const save = async () => {
    setSaving(true);
    try {
      await setOrderDeliveryMode(order.id, "pickup", vehicle.toUpperCase());
      toast.success(t("pickupPass.saved"));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
      <div className="flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
        <Ticket className="h-4 w-4" aria-hidden />
        <p className="text-sm font-bold">{t("pickupPass.title")}</p>
      </div>
      <div className="flex flex-col items-center p-4 text-center">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={order.orderNo} size={168} level="M" aria-label={t("pickupPass.qrLabel", { no: order.orderNo })} />
        </div>
        <p className="mt-2 font-mono text-lg font-bold text-primary">{order.orderNo}</p>
        <p className="text-sm font-semibold">{t("pickupPass.showAtGate")}</p>
        <dl className="mt-3 w-full space-y-1.5 text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("pickupPass.date")}</dt>
            <dd className="font-semibold">{order.deliveryDate ? dateLabel(order.deliveryDate, lang) : "—"}</dd>
          </div>
          {plant?.address && (
            <div>
              <dt className="text-muted-foreground">{t("pickupPass.plant")}</dt>
              <dd className="font-semibold">
                {plant.company}, {plant.address}
              </dd>
              <button
                type="button"
                onClick={() => openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${plant.company} ${plant.address}`)}`)}
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-secondary underline underline-offset-4"
              >
                <MapPin className="h-4 w-4" aria-hidden /> {t("pickupPass.openMap")}
              </button>
            </div>
          )}
        </dl>
        <label className="mt-2 block w-full text-left text-sm">
          <span className="text-muted-foreground">{t("pickupPass.vehicle")}</span>
          {editable ? (
            <span className="mt-1 flex gap-2">
              <input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value.toUpperCase().slice(0, 15))}
                placeholder="MH24AB1234"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 uppercase"
              />
              <button
                type="button"
                disabled={saving || offline || vehicle === (order.pickupVehicleNo ?? "")}
                onClick={() => void save()}
                className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("pickupPass.save")}
              </button>
            </span>
          ) : (
            <span className="mt-1 block font-semibold">{order.pickupVehicleNo || "—"}</span>
          )}
        </label>
      </div>
    </section>
  );
}
