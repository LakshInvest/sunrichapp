import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Crosshair, Loader2, LocateOff, MapPin } from "lucide-react";
import { locateDevice } from "@/lib/native";
import { SheetDrawer } from "./SheetDrawer";
import { PinMap } from "./PinMap";
import { PlaceSearch } from "./PlaceSearch";
import { reverseGeocode } from "@/lib/gmaps";
import { DEFAULT_LOCATION, type LocationValue } from "./locationShared";

/** Debounced reverse geocode of the pin position. Shared by the picker and the form summary. */
export function useReverseAddress(value: LocationValue): string {
  const [address, setAddress] = useState("");
  useEffect(() => {
    const lat = (value ?? DEFAULT_LOCATION).lat;
    const lng = (value ?? DEFAULT_LOCATION).lng;
    let alive = true;
    setAddress("");
    const id = setTimeout(() => {
      reverseGeocode(lat, lng).then((a) => {
        if (alive && a) setAddress(a);
      });
    }, 700);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [value]);
  return address;
}

/** GPS button + accuracy readout + draggable-pin map with reverse-geocoded address. */
export function LocationPicker({
  value,
  onChange,
  autoLocate = false,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  /** Start locating on mount (explanation sheet first if not yet accepted). */
  autoLocate?: boolean;
}) {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<"denied" | "off" | null>(null);
  const [disclose, setDisclose] = useState(false);
  const isDefault = value.lat === DEFAULT_LOCATION.lat && value.lng === DEFAULT_LOCATION.lng;

  // Play policy: our own prominent disclosure before the system prompt.
  const locate = () => {
    if (locating) return;
    if (localStorage.getItem("sunrich.locConsent") !== "1") {
      setDisclose(true);
      return;
    }
    void runLocate();
  };
  useEffect(() => {
    if (!autoLocate && !isDefault) return;
    // Wait for the parent sheet to finish opening before stacking the explanation sheet.
    const id = setTimeout(locate, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  const runLocate = async () => {
    setProblem(null);
    setLocating(true);
    const r = await locateDevice();
    setLocating(false);
    if (r.ok) onChange({ lat: r.lat, lng: r.lng, accuracy: r.accuracy });
    else setProblem(r.reason);
  };

  // Pin → address: debounce while the pin moves, then reverse geocode (browser Geocoder).
  const pinAddress = useReverseAddress(value);

  return (
    <div className="flex flex-col gap-3">
      <SheetDrawer open={disclose} onOpenChange={setDisclose}>
        <div className="px-5 pb-8 pt-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15">
            <MapPin className="h-6 w-6 text-secondary" aria-hidden />
          </span>
          <h2 className="mt-3 text-lg font-bold text-foreground">{t("location.title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("location.body")}</p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("sunrich.locConsent", "1");
              setDisclose(false);
              void runLocate();
            }}
            className="mt-5 min-h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            {t("location.continue")}
          </button>
          <button
            type="button"
            onClick={() => setDisclose(false)}
            className="mt-2 min-h-12 w-full rounded-xl text-base font-semibold text-muted-foreground"
          >
            {t("location.notNow")}
          </button>
        </div>
      </SheetDrawer>
      <SheetDrawer open={problem !== null} onOpenChange={(o) => !o && setProblem(null)}>
        <div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 text-center" data-testid="location-problem">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            {problem === "off" ? <LocateOff className="h-6 w-6 text-accent-foreground" aria-hidden /> : <MapPin className="h-6 w-6 text-secondary" aria-hidden />}
          </span>
          <h2 className="mt-3 text-lg font-bold text-foreground">
            {problem === "off" ? t("location.offTitle") : t("location.deniedTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {problem === "off" ? t("location.offBody") : t("location.deniedBody")}
          </p>
          <button
            type="button"
            onClick={() => void runLocate()}
            className="mt-5 min-h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            {problem === "off" ? t("location.retry") : t("location.allow")}
          </button>
          <button
            type="button"
            onClick={() => setProblem(null)}
            className="mt-2 min-h-12 w-full rounded-xl text-base font-semibold text-secondary"
          >
            {t("location.manual")}
          </button>
        </div>
      </SheetDrawer>
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
      <PlaceSearch
        onPick={(d) => {
          if (d) onChange({ lat: d.lat, lng: d.lng, accuracy: null });
        }}
      />
      <p className="text-center text-xs text-muted-foreground">{t("registration.adjustHint")}</p>
      <PinMap
        value={value ?? DEFAULT_LOCATION}
        onChange={onChange}
        className="h-44 w-full overflow-hidden rounded-xl border border-border"
      />
      {pinAddress && (
        <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden />
          <span className="min-w-0">{pinAddress}</span>
        </p>
      )}
    </div>
  );
}
