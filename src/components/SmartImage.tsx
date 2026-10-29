import { useState } from "react";
import { Droplets } from "lucide-react";

/**
 * Shows an image and falls back to a clean aqua placeholder with a
 * water-drop icon (or an optional fallback image) when the URL is missing
 * or fails to load — never a broken image. Lazy-loaded with a soft fade-in.
 */
export function SmartImage({
  src,
  alt,
  className,
  iconClassName,
  fallbackSrc,
}: {
  src?: string | null | undefined;
  alt: string;
  className?: string | undefined;
  iconClassName?: string | undefined;
  fallbackSrc?: string | null | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const showFallback = (!src || failed) && fallbackSrc;
  const showPlaceholder = (!src || failed) && !fallbackSrc;

  if (showPlaceholder) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-secondary/15 ${className ?? ""}`}
      >
        <Droplets
          aria-hidden
          className={iconClassName ?? "h-1/3 w-1/3 text-secondary/70"}
        />
      </div>
    );
  }

  return (
    <img
      src={showFallback ? (fallbackSrc ?? undefined) : (src ?? undefined)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
