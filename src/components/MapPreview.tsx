import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { getMapsError, loadGoogleMaps } from "@/lib/gmaps";

/**
 * Read-only map preview with a pin, rendered with the Maps JavaScript API in
 * the browser (static, non-interactive). Uses the same website-restricted key
 * as the pin picker, so it works without the Maps Static API. When Maps fails
 * to load it shows a clean pin + address fallback, never raw coordinates.
 */
export default function MapPreview({
  lat,
  lng,
  className = "h-36 w-full overflow-hidden rounded-xl border border-border",
  address,
  truck,
  interactive = false,
}: {
  lat: number;
  lng: number;
  className?: string;
  address?: string | null;
  /** Live truck position (after "Out for delivery"). */
  truck?: { lat: number; lng: number } | null;
  interactive?: boolean;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    window.gm_authFailure = () => {
      if (alive) setFailed(true);
    };
    loadGoogleMaps()
      .then((maps) => {
        if (!alive || !divRef.current) return;
        const map = new maps.Map(divRef.current, {
          center: { lat, lng },
          zoom: 16,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: interactive ? "greedy" : "none",
          keyboardShortcuts: false,
        });
        new maps.Marker({ map, position: { lat, lng } });
        if (truck) {
          new maps.Marker({
            map,
            position: truck,
            label: { text: "🚚", fontSize: "22px" },
            icon: { path: maps.SymbolPath.CIRCLE, scale: 16, fillColor: "#ffffff", fillOpacity: 1, strokeColor: "#0B2545", strokeWeight: 2 },
          });
          const b = new maps.LatLngBounds();
          b.extend({ lat, lng });
          b.extend(truck);
          map.fitBounds(b, 48);
        }
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [lat, lng, truck?.lat, truck?.lng, interactive]);

  if (failed) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1 bg-muted px-3 text-center text-muted-foreground`}>
        <MapPin className="h-6 w-6 text-secondary" aria-hidden />
        {address && <span className="line-clamp-2 text-xs font-medium text-foreground">{address}</span>}
        {getMapsError() && <span className="text-[10px] opacity-60" data-testid="maps-error">{getMapsError()}</span>}
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <div ref={divRef} className="h-full w-full" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-muted" />}
    </div>
  );
}
