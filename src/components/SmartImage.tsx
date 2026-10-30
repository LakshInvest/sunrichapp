import { useState } from "react";

/**
 * Shows a Command Center image. When the URL is missing or fails to load it
 * renders a clean placeholder — soft brand gradient plus the first letter of
 * the name (alt) — never a bundled photo. Lazy-loaded with a soft fade-in.
 * Pass `width` to request a smaller rendition of Supabase storage images.
 */
export function SmartImage({
  src,
  alt,
  className,
  width,
  eager,
}: {
  src?: string | null | undefined;
  alt: string;
  className?: string | undefined;
  iconClassName?: string | undefined;
  width?: number | undefined;
  eager?: boolean | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    const letter = alt.trim().charAt(0).toUpperCase();
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-secondary/25 via-secondary/10 to-primary/15 ${className ?? ""}`}
      >
        {letter && (
          <span aria-hidden className="text-3xl font-bold text-primary/40">
            {letter}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={sizedUrl(src, width)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

/** Supabase public storage URLs can be served resized via the render endpoint. */
export function sizedUrl(src: string, width?: number): string {
  if (!width || !src.includes("/storage/v1/object/public/")) return src;
  const url = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  return `${url}${url.includes("?") ? "&" : "?"}width=${width * 2}&resize=contain&quality=75`;
}
