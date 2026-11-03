import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loc, sizedUrl, type CatalogBanner } from "@/lib/catalogue";

/**
 * Top-of-Home banner carousel (1080×720, 3:2). Auto-slides using each banner's own
 * display time, pauses while touched, swipeable, with position dots. `overlay` (address
 * + bell) sits on a soft dark gradient so it reads on any image.
 */
export function HeroCarousel({
  banners,
  lang,
  onOpen,
  overlay,
  fallback,
}: {
  banners: CatalogBanner[];
  lang: string;
  onOpen: (b: CatalogBanner) => void;
  overlay: ReactNode;
  fallback: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);
  useEffect(() => {
    if (paused || banners.length < 2) return;
    const secs = banners[index]?.displaySeconds ?? 5;
    const t = setTimeout(() => go((index + 1) % banners.length), secs * 1000);
    return () => clearTimeout(t);
  }, [index, paused, banners, go]);

  return (
    <div className="relative">
      {banners.length === 0 ? (
        fallback
      ) : (
        <div
          ref={ref}
          className="no-scrollbar flex aspect-[3/2] w-full snap-x snap-mandatory overflow-x-auto bg-primary"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setTimeout(() => setPaused(false), 1500)}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onOpen(b)}
              aria-label={loc(b.title, lang) || `Banner ${i + 1}`}
              className="relative h-full w-full shrink-0 snap-center overflow-hidden text-left"
            >
              {b.imageUrl && (
                <img
                  src={sizedUrl(b.imageUrl, 1080)}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (b.imageUrl && img.src !== b.imageUrl) img.src = b.imageUrl;
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {(b.title.en.trim() || b.subtitle) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/85 to-transparent px-5 pb-8 pt-12">
                  {b.title.en.trim() && <p className="text-lg font-bold leading-snug text-primary-foreground">{loc(b.title, lang)}</p>}
                  {b.subtitle && <p className="text-sm text-primary-foreground/85">{loc(b.subtitle, lang)}</p>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/70 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 top-0 px-5 pt-[max(1rem,env(safe-area-inset-top))]">{overlay}</div>
      {banners.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
          {banners.map((b, i) => (
            <span key={b.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
