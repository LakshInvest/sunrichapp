import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Crosshair, Loader2 } from "lucide-react";
import { DEFAULT_LOCATION, type LocationValue } from "./locationShared";

// Leaflet touches browser APIs at import time — keep it out of the SSR graph.
const LocationMap = lazy(() => import("./LocationMap"));

/** GPS button + accuracy readout + draggable-pin map. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const locate = () => {
    if (locating) return;
    setDenied(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      () => {
        setLocating(false);
        setDenied(true);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-secondary bg-secondary/10 text-base font-semibold text-primary transition active:scale-[0.98] disabled:opacity-60"
      >
        {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5" />}
        {locating ? t("registration.locating") : t("registration.useMyLocation")}
      </button>

      {value.accuracy != null && (
        <p className="text-center text-xs font-medium text-muted-foreground">
          {t("registration.accuracy", { meters: Math.max(1, Math.round(value.accuracy)) })}
        </p>
      )}
      {denied && (
        <p role="status" className="rounded-xl bg-accent/10 px-4 py-3 text-center text-sm text-foreground">
          <span className="font-semibold">{t("registration.locationDenied")}. </span>
          {t("registration.locationDeniedHelp")}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">{t("registration.adjustHint")}</p>
      <Suspense
        fallback={<div className="h-56 w-full animate-pulse rounded-xl border border-border bg-muted" />}
      >
        <LocationMap value={value ?? DEFAULT_LOCATION} onChange={onChange} />
      </Suspense>
    </div>
  );
}
