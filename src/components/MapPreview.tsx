import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { staticMapUrl } from "@/lib/gmaps";

/**
 * Read-only Google Static Maps preview loaded directly by the browser — the
 * key is website-restricted, so the browser's own referrer authorizes it.
 * URLs are cached per coordinate set to limit billable requests.
 */
const cache = new Map<string, string>();

export default function MapPreview({
  lat,
  lng,
  className = "h-36 w-full overflow-hidden rounded-xl border border-border",
}: {
  lat: number;
  lng: number;
  className?: string;
}) {
  const key = `${lat},${lng}`;
  const [src, setSrc] = useState<string | null>(() => cache.get(key) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const cached = cache.get(key);
    setSrc(cached ?? null);
    setFailed(false);
    if (cached) return;
    staticMapUrl(lat, lng)
      .then((url) => {
        cache.set(key, url);
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}
