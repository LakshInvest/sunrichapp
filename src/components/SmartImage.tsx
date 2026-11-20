import { Milk } from "lucide-react";
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
  caption,
}: {
  src?: string | null | undefined;
  alt: string;
  className?: string | undefined;
  iconClassName?: string | undefined;
  width?: number | undefined;
  eager?: boolean | undefined;
  caption?: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const [plain, setPlain] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div role="img" aria-label={alt} className={`flex flex-col items-center justify-center gap-1 bg-muted ${className ?? ""}`}>
        <Milk aria-hidden strokeWidth={1.25} className="h-1/3 max-h-12 w-auto text-muted-foreground/60" />
        {caption && <span className="px-1 text-center text-xs font-medium text-muted-foreground">{caption}</span>}
      </div>
    );
  }

  return (
    <img
      src={plain ? src : sizedUrl(src, width)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => (plain || sizedUrl(src, width) === src ? setFailed(true) : setPlain(true))}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

/** Supabase public storage URLs can be served resized via the render endpoint. */
export function sizedUrl(src: string, width?: number): string {
  if (!width || !src.includes("/storage/v1/object/public/")) return src;
  const url = new URL(src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/"));
  url.searchParams.set("width", String(width));
  url.searchParams.set("resize", "contain");
  url.searchParams.set("quality", "75");
  // Supabase negotiates WebP automatically; retain original URL fallback above.
  return url.toString();
}
