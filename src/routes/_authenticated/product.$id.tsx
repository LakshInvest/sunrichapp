import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { SmartImage } from "@/components/SmartImage";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorState, EmptyState, GridSkeleton } from "@/components/catalog/states";
import { PriceBlock } from "@/components/catalog/ProductCard";
import { fallbackImageFor } from "@/components/catalog/image-fallbacks";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useFavourites } from "@/hooks/use-favourites";
import {
  clampQty,
  fetchCatalogue,
  formatINR,
  loc,
  readCatalogueCache,
  saveCartPrice,
  type CatalogData,
} from "@/lib/catalogue";

export const Route = createFileRoute("/_authenticated/product/$id")({
  head: () => ({
    meta: [
      { title: en.product.metaTitle },
      { name: "description", content: en.product.metaDescription },
      { property: "og:title", content: en.product.metaTitle },
      { property: "og:description", content: en.product.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { quantities, setQty } = useCart();
  const offline = useOffline();
  const fav = useFavourites();
  const deva = lang === "en" ? "" : "font-deva";

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());
  const [slide, setSlide] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (force = false) => {
    try {
      const fresh = await fetchCatalogue({ force });
      setData(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
      throw e;
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const product = useMemo(() => data?.products.find((p) => p.id === id) ?? null, [data, id]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const urls = [product.imageUrl, ...product.images].filter(
      (u, i, arr): u is string => typeof u === "string" && u !== "" && arr.indexOf(u) === i,
    );
    return urls.length > 0 ? urls : [];
  }, [product]);

  const similar = useMemo(
    () =>
      (data?.products ?? [])
        .filter((p) => p.id !== id && p.categoryId && p.categoryId === product?.categoryId)
        .slice(0, 6),
    [data, id, product],
  );

  const qty = product ? quantities[product.id] ?? 0 : 0;
  const volume =
    product?.volumeMl == null
      ? null
      : product.volumeMl >= 1000
        ? `${Number((product.volumeMl / 1000).toFixed(1)).toString()} L`
        : `${product.volumeMl} ml`;

  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || gallery.length === 0) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const addToCart = () => {
    if (!product || offline) return;
    const next = clampQty(product, Math.max(qty, product.minOrderQty || 1));
    setQty(product.id, next);
    if (product.price != null) saveCartPrice(product.id, product.price);
  };

  if (loading && !product) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-background pb-28">
        <div className="px-5 pt-8">
          <GridSkeleton count={2} />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-background pb-28">
        {data ? (
          <EmptyState title={t("product.notFound")} body={t("product.notFoundBody")} />
        ) : (
          <ErrorState message={loadError} onRetry={() => void load().catch(() => undefined)} />
        )}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="min-h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md"
          >
            {t("cart.browse")}
          </button>
        </div>
        <BottomNav />
      </main>
    );
  }

  const isFav = fav.isFav(product);
  const canOrder = product.canOrder;
  const blocked = !canOrder;

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-40 ${deva}`}>
      <OfflineBanner />

      <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/95 px-3 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{loc(product.name, lang)}</p>
        <button
          type="button"
          onClick={() => void fav.toggle(product)}
          aria-pressed={isFav}
          aria-label={t(isFav ? "catalog.removeFavourite" : "catalog.addFavourite")}
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95 ${
            isFav ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <svg viewBox="0 0 24 24" className={`h-6 w-6 ${isFav ? "fill-destructive" : "fill-none"} stroke-current`} strokeWidth={1.8} aria-hidden>
            <path d="M12 21s-7.5-4.6-10-9.3C.5 8 2.6 4 6.5 4c2.2 0 3.8 1.2 5.5 3.2C13.7 5.2 15.3 4 17.5 4 21.4 4 23.5 8 22 11.7 19.5 16.4 12 21 12 21Z" />
          </svg>
        </button>
      </header>

      {/* Gallery */}
      <div
        ref={galleryRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-secondary/10"
        onScroll={onGalleryScroll}
      >
        {gallery.length > 0 ? (
          gallery.map((url, i) => (
            <div key={url} className="w-full shrink-0 snap-center">
              <SmartImage src={url} alt={`${loc(product.name, lang)} ${i + 1}`} className="aspect-square w-full object-cover" />
            </div>
          ))
        ) : (
          <div className="w-full shrink-0 snap-center">
            <SmartImage
              src={null}
              alt={loc(product.name, lang)}
              fallbackSrc={fallbackImageFor(product)}
              className="aspect-square w-full object-cover"
            />
          </div>
        )}
      </div>
      {gallery.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2.5">
          {gallery.map((url, i) => (
            <span
              key={url}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${i === slide ? "w-4 bg-primary" : "w-1.5 bg-primary/25"}`}
            />
          ))}
        </div>
      )}

      <div className="px-5">
        <h1 className="mt-4 text-xl font-bold leading-snug text-foreground">{loc(product.name, lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[
            product.brandName,
            loc(product.packLabel, lang),
            volume,
            product.sellUnit && product.unitsPerSellUnit
              ? t("product.sellUnitInfo", { unit: product.sellUnit, units: product.unitsPerSellUnit })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <PriceBlock product={product} size="detail" className="mt-4" />

        {product.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {loc(product.description, lang)}
          </p>
        )}

        {/* Quantity */}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="text-sm font-semibold text-foreground">{t("product.quantity")}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty(product.id, qty - 1)}
              disabled={offline || qty <= 0}
              aria-label={t("home.decreaseQty")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background transition active:scale-90 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-8 text-center text-lg font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(product.id, qty + 1)}
              disabled={offline || (product.maxOrderQty != null && qty >= product.maxOrderQty)}
              aria-label={t("home.increaseQty")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background transition active:scale-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        {(product.minOrderQty > 1 || product.maxOrderQty != null) && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("product.qtyLimits", {
              min: product.minOrderQty,
              max: product.maxOrderQty ?? "—",
            })}
          </p>
        )}
        {product.bulkThresholdQty != null && qty >= product.bulkThresholdQty && (
          <p className="mt-3 rounded-xl bg-accent/15 px-3 py-2 text-center text-xs font-medium text-accent-foreground">
            {t("cart.bulkNote")}
          </p>
        )}

        {/* You may also like */}
        {similar.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-foreground">{t("product.similar")}</h2>
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
              {similar.map((s) => (
                <div key={s.id} className="w-40 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/product/$id", params: { id: s.id } })}
                    className="block w-full overflow-hidden rounded-2xl border border-border bg-card p-2.5 text-left shadow-sm transition active:scale-[0.98]"
                  >
                    <SmartImage
                      src={s.imageUrl ?? s.images[0] ?? null}
                      alt={loc(s.name, lang)}
                      fallbackSrc={fallbackImageFor(s)}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground">
                      {loc(s.name, lang)}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {s.price === null ? t("catalog.priceOnRequest") : formatINR(s.price)}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky add-to-cart, sitting above the bottom navigation */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("product.total")}</p>
            <p className="text-lg font-bold text-primary">
              {product.price === null ? t("catalog.priceOnRequest") : formatINR(product.price * Math.max(qty, 0))}
            </p>
          </div>
          {qty > 0 ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/cart" })}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-base font-semibold text-secondary-foreground shadow-md transition active:scale-[0.98]"
            >
              {t("cart.viewCart")}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={addToCart}
              disabled={blocked || offline}
              title={blocked ? t("cart.orderingAfterApproval") : offline ? t("offline.hint") : undefined}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("product.addToCart")}
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
