import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { LocationPicker } from "@/components/LocationPicker";
import { DEFAULT_LOCATION, type LocationValue } from "@/components/locationShared";
import { Switch } from "@/components/ui/switch";
import { useOffline } from "@/hooks/use-offline";
import { serverMessage, scrollToFirstError } from "@/lib/form-errors";
import { saveMyAddress, validateAddress, type SavedAddress } from "@/lib/addresses";
import { reverseGeocodeParts } from "@/lib/gmaps";

const inputCls =
  "min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30";

type Form = {
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  pincode: string;
  contactName: string;
  contactMobile: string;
  isDefault: boolean;
};

/** Add / edit a saved address. First saved address becomes default automatically. */
export function AddressEditor({
  open,
  onOpenChange,
  address,
  isFirst,
  onSaved,
  autoLocate = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  address: SavedAddress | null;
  isFirst: boolean;
  onSaved: (id: string) => void;
  autoLocate?: boolean;
}) {
  const { t } = useTranslation();
  const offline = useOffline();
  const [f, setF] = useState<Form>(empty());
  const [pin, setPin] = useState<LocationValue | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"map" | "details">("map");
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [geo, setGeo] = useState({ full: "", area: "", city: "", pincode: "", state: "" });
  const [geoLoading, setGeoLoading] = useState(false);
  // Pin → area / city / pincode (debounced); city + pincode are filled from here, not typed.
  useEffect(() => {
    if (!open || !pin) return;
    let alive = true;
    setGeoLoading(true);
    const id = setTimeout(() => {
      void reverseGeocodeParts(pin.lat, pin.lng).then((g) => {
        if (!alive) return;
        setGeo(g);
        setGeoLoading(false);
        if (g.city || g.pincode) setF((cur) => ({ ...cur, city: g.city || cur.city, pincode: g.pincode || cur.pincode, line2: g.area || cur.line2 }));
      });
    }, 600);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [open, pin]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setServerErr(null);
    setStep(address ? "details" : "map");
    setReceiverOpen(false);
    if (address) {
      setF({
        label: address.label,
        line1: address.line1,
        line2: address.line2 ?? "",
        landmark: address.landmark ?? "",
        city: address.city ?? "",
        pincode: address.pincode ?? "",
        contactName: address.contactName ?? "",
        contactMobile: address.contactMobile ?? "",
        isDefault: address.isDefault,
      });
      setPin(address.lat != null && address.lng != null ? { lat: address.lat, lng: address.lng, accuracy: null } : null);
    } else {
      setF({ ...empty(), isDefault: isFirst });
      setPin(null);
    }
  }, [open, address, isFirst]);

  const save = async () => {
    const e = validateAddress(f);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setTimeout(scrollToFirstError, 0);
      return;
    }
    setSaving(true);
    setServerErr(null);
    try {
      const id = await saveMyAddress({
        id: address?.id ?? null,
        label: f.label,
        line1: f.line1,
        line2: f.line2 || null,
        landmark: f.landmark || null,
        city: f.city || null,
        state: geo.state || address?.state || null,
        pincode: f.pincode || null,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        contactName: f.contactName || null,
        contactMobile: f.contactMobile ? f.contactMobile.replace(/\D/g, "") : null,
        isDefault: isFirst || f.isDefault,
      });
      onSaved(id);
      onOpenChange(false);
    } catch (err) {
      setServerErr(serverMessage(err, t("addresses.errSave")));
      setTimeout(scrollToFirstError, 0);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Form, label: string, opts: { numeric?: boolean; max?: number; autoFocus?: boolean } = {}) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        autoFocus={opts.autoFocus}
        value={String(f[key])}
        onChange={(e) => setF({ ...f, [key]: opts.numeric ? e.target.value.replace(/\D/g, "") : e.target.value })}
        inputMode={opts.numeric ? "numeric" : undefined}
        maxLength={opts.max}
        aria-invalid={!!errors[key]}
        className={inputCls}
      />
      {errors[key] && (
        <span data-field-error className="text-xs font-medium text-destructive">
          {t(errors[key])}
        </span>
      )}
    </label>
  );

  const area = [geo.area, geo.city, geo.pincode].filter(Boolean).join(", ");

  return (
    <SheetDrawer open={open} onOpenChange={onOpenChange} className="max-h-[96vh]">
      {step === "map" ? (
        <div className="flex max-h-[92vh] flex-col overflow-y-auto px-5 pb-6 pt-2">
          <h2 className="text-lg font-bold text-foreground">{address ? t("addresses.editTitle") : t("addresses.addTitle")}</h2>
          <div className="mt-3">
            <LocationPicker value={pin ?? DEFAULT_LOCATION} onChange={setPin} autoLocate={autoLocate && !address} />
          </div>
          <div className="mt-3 min-h-12 rounded-xl bg-muted px-3 py-2 text-sm text-foreground" data-testid="geo-area">
            {geoLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : area || geo.full || t("address2.moveMap")}
          </div>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            {t("address2.confirmPin")}
          </button>
        </div>
      ) : (
        <div className="overflow-y-auto px-5 pb-8 pt-2">
          <button type="button" onClick={() => setStep("map")} className="min-h-10 text-sm font-semibold text-secondary">
            ← {area || t("address2.changePin")}
          </button>
          <div className="mt-2 space-y-3">
            {field("line1", t("address2.line1"), { autoFocus: !address })}
            {field("landmark", t("address2.landmark"))}
            {receiverOpen || f.contactName || f.contactMobile ? (
              <>
                {field("contactName", t("addresses.contactName"))}
                {field("contactMobile", t("addresses.contactMobile"), { numeric: true, max: 10 })}
              </>
            ) : (
              <button type="button" onClick={() => setReceiverOpen(true)} className="min-h-11 text-sm font-semibold text-secondary">
                {t("address2.someoneElse")}
              </button>
            )}
            {!isFirst && !address?.isDefault && (
              <label className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{t("addresses.makeDefault")}</span>
                <Switch checked={f.isDefault} onCheckedChange={(v) => setF({ ...f, isDefault: v })} />
              </label>
            )}
          </div>
          {serverErr && (
            <p data-field-error role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {serverErr}
            </p>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || offline}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {saving ? t("account.saving") : t("addresses.save")}
          </button>
          {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        </div>
      )}
    </SheetDrawer>
  );
}

function empty(): Form {
  return { label: "shop", line1: "", line2: "", landmark: "", city: "", pincode: "", contactName: "", contactMobile: "", isDefault: false };
}
