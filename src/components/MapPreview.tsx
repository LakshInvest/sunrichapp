import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/gmaps";

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
}: {
  lat: number;
  lng: number;
  className?: string;
  address?: string | null;
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
          gestureHandling: "none",
          keyboardShortcuts: false,
        });
        new maps.Marker({ map, position: { lat, lng } });
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [lat, lng]);

  if (failed) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1 bg-muted px-3 text-center text-muted-foreground`}>
        <MapPin className="h-6 w-6 text-secondary" aria-hidden />
        {address && <span className="line-clamp-2 text-xs font-medium text-foreground">{address}</span>}
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
