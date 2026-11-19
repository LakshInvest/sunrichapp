import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loc, type CatalogBanner } from "@/lib/catalogue";
import { sizedUrl } from "@/components/SmartImage";

/**
 * Top-of-Home banner carousel (1080×810, 4:3). Auto-slides using each banner's own
 * display time, pauses while touched, swipeable, with position dots. `overlay` (address
 * + bell) sits on a soft dark gradient so it reads on any image.
 */
export function HeroCarousel({
  banners,
  lang,
  onOpen,
  overlay,
  fallback,
  safeTop = true,
}: {
  banners: CatalogBanner[];
  lang: string;
  onOpen: (b: CatalogBanner) => void;
  overlay: ReactNode;
  fallback: ReactNode;
  safeTop?: boolean;
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
    <div data-home-hero className="relative aspect-[4/3] w-full overflow-hidden bg-primary">
      {banners.length === 0 ? (
        fallback
      ) : (
        <div
          ref={ref}
          className="no-scrollbar flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto bg-primary"
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
                  src={sizedUrl(b.imageUrl, 828)}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  width={828}
                  height={621}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (b.imageUrl && img.src !== b.imageUrl) img.src = b.imageUrl;
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/70 to-transparent" aria-hidden />
      <div className={`absolute inset-x-0 top-0 px-5 ${safeTop ? "pt-[max(0.5rem,env(safe-area-inset-top))]" : "pt-2"}`}>{overlay}</div>
      {banners.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-11 flex justify-center gap-1.5" aria-hidden>
          {banners.map((b, i) => (
            <span key={b.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
