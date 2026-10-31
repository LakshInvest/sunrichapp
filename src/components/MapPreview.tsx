import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getStaticMap } from "@/lib/maps.functions";

/**
 * Read-only Google map image with a fixed pin. Rendered from a static map
 * fetched server-side, so the Maps key never reaches the browser.
 */
export default function MapPreview({
  lat,
  lng,
  className = "h-36 w-full overflow-hidden rounded-xl border border-border",
}: {
  lat: number;
  lng: number;
  className?: string;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setUri(null);
    setFailed(false);
    getStaticMap({ data: { lat, lng, zoom: 16 } })
      .then((r) => {
        if (alive) setUri(r.uri);
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
      <div className={`${className} flex items-center justify-center gap-2 bg-muted text-muted-foreground`}>
        <MapPin className="h-4 w-4 text-secondary" aria-hidden />
        <span className="text-xs font-medium">📍 {lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {uri ? (
        <img src={uri} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}
