import { useState } from "react";
import { Droplets } from "lucide-react";

/**
 * Shows an image and falls back to a clean aqua placeholder with a
 * water-drop icon when the URL is missing or fails to load — never a
 * broken image.
 */
export function SmartImage({
  src,
  alt,
  className,
  iconClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
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
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
