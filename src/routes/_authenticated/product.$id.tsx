import { formatPack } from "@/lib/pack-label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { serverMessage } from "@/lib/form-errors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowLeft, Share2 } from "lucide-react";
import { fetchProductExtras, parseProductExtras, productShareUrl } from "@/lib/product-extras";
import { shareLink } from "@/lib/native";
import en from "@/locales/en.json";
import { SmartImage } from "@/components/SmartImage";
import { ImageViewer } from "@/components/ImageViewer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorState, EmptyState, GridSkeleton } from "@/components/catalog/states";
import { PriceBlock, QtyStepper } from "@/components/catalog/ProductCard";
import { perUnit, rupees2 } from "@/lib/price-math";
import { isBusinessType, useTypeCode } from "@/lib/customer-type";
import { useRateLocked } from "@/lib/rate-lock";
import { openPriceRequestChat } from "@/lib/price-request";
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
  const rateLocked = useRateLocked();
  const business = isBusinessType(useTypeCode());

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());
  const [slide, setSlide] = useState(0);
  const [viewer, setViewer] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [extrasRaw, setExtrasRaw] = useState<unknown>(null);
  const [tab, setTab] = useState<"desc" | "delivery" | "faq">("desc");
  useEffect(() => {
    let live = true;
    setExtrasRaw(null);
    fetchProductExtras(id)
      .then((r) => live && setExtrasRaw(r))
      .catch(() => undefined); // page still works from the catalogue
    return () => {
      live = false;
    };
  }, [id]);
  const extras = useMemo(() => parseProductExtras(extrasRaw, lang), [extrasRaw, lang]);

  const load = useCallback(async (force = false) => {
    try {
      const fresh = await fetchCatalogue({ force });
      setData(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError(serverMessage(e, t("errors.generic")));
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
    const urls = [...extras.images.map((i) => i.url), product.imageUrl, ...product.images].filter(
      (u, i, arr): u is string => typeof u === "string" && u !== "" && arr.indexOf(u) === i,
    );
    return urls.length > 0 ? urls : [];
  }, [product, extras]);

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
  const goSlide = (i: number) => {
    const el = galleryRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
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
      </main>
    );
  }

  const canOrder = product.canOrder;
  const unit = perUnit(product);
  const cartTotal = Object.entries(quantities).reduce((sum, [pid, q]) => {
    const p = data?.products.find((x) => x.id === pid);
    return p?.price != null ? sum + p.price * q : sum;
  }, 0);
  const blocked = !canOrder;

  return (
    <main className={`mx-auto min-h-dvh max-w-md overflow-x-clip bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))] ${deva}`}>
      <OfflineBanner />

      <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/95 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : void navigate({ to: "/home" }))}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{loc(product.name, lang)}</p>
        <button
          type="button"
          onClick={() => void shareLink({ title: loc(product.name, lang), text: loc(product.name, lang), url: productShareUrl(product.id) })}
          aria-label={t("product3.share")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Gallery */}
      <div className="relative">
      <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
        {packLine(product, volume, lang, t)}
      </span>
      <div
        ref={galleryRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-secondary/10"
        onScroll={onGalleryScroll}
      >
        {gallery.length > 0 ? (
          gallery.map((url, i) => (
            <button
              type="button"
              key={url}
              onClick={() => setViewer(url)}
              aria-label={t("product.viewImage")}
              className="block w-full shrink-0 snap-center"
            >
              <SmartImage src={url} width={400} eager={i === 0} alt={`${loc(product.name, lang)} ${i + 1}`} className="aspect-square w-full object-cover" />
            </button>
          ))
        ) : (
          <div className="w-full shrink-0 snap-center">
            <SmartImage
              src={null}
              alt={loc(product.name, lang)}
              className="aspect-square w-full object-cover"
            />
          </div>
        )}
      </div>
      {gallery.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {gallery.map((url, i) => (
            <span key={url} aria-hidden className={`h-1.5 rounded-full shadow transition-all ${i === slide ? "w-4 bg-primary" : "w-1.5 bg-card"}`} />
          ))}
        </div>
      )}
      </div>
      {gallery.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-3">
          {gallery.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => goSlide(i)}
              aria-label={`${t("product.viewImage")} ${i + 1}`}
              aria-current={i === slide}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 ${i === slide ? "border-primary" : "border-transparent opacity-70"}`}
            >
              <SmartImage src={url} width={80} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-5">
        <h1 className="mt-4 text-xl font-bold leading-snug text-foreground">{loc(product.name, lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {packLine(product, volume, lang, t)}
        </p>

        {rateLocked || product.price === null ? (
          <PriceBlock product={product} size="detail" className="mt-4" />
        ) : (
          <div className="mt-4 space-y-0.5" data-testid="product-price">
            <p className="text-lg text-foreground">
              <span className="text-2xl font-bold text-primary">{formatINR(product.price)}</span>
              <span className="text-muted-foreground"> / {t("product2.pack")}</span>
              <span className="text-xs text-muted-foreground"> {t("product3.inclGst")}</span>
              {unit.rate != null && <span className="text-sm text-muted-foreground"> · {t("product2.perBottle", { amount: rupees2(unit.rate) })}</span>}
            </p>
            {unit.mrp != null ? (
              <p className="text-sm text-muted-foreground">{t("product2.mrpPerBottle", { amount: rupees2(unit.mrp) })}</p>
            ) : product.mrp != null && product.mrp > product.price ? (
              <p className="text-sm text-muted-foreground">{t("catalog.mrp", { amount: formatINR(product.mrp) })}</p>
            ) : null}
            {unit.saving != null && (
              <p className="text-sm font-semibold text-success">
                {t(business ? "product2.margin" : "product2.save", { amount: formatINR(unit.saving) })}
              </p>
            )}
          </div>
        )}

        {extras.highlights.length > 0 && <Highlights items={extras.highlights} />}

        <InfoTabs
          tab={tab}
          setTab={setTab}
          sections={{
            desc: product.description ? loc(product.description, lang) : null,
            delivery: extras.delivery,
            faq: extras.faqs.length > 0 ? extras.faqs : null,
          }}
        />

        {(product.minOrderQty > 1 || product.maxOrderQty != null) && product.price !== null && !rateLocked && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("product.qtyLimits", {
              min: product.minOrderQty,
              max: product.maxOrderQty ?? "—",
            })}
          </p>
        )}
        {product.bulkThresholdQty != null && qty >= product.bulkThresholdQty && product.price !== null && (
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
                    <SmartImage width={160}
                      src={s.imageUrl ?? s.images[0] ?? null}
                      alt={loc(s.name, lang)}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground">
                      {loc(s.name, lang)}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {rateLocked ? `🔒 ${t("catalog.rateAfterApproval")}` : s.price === null ? t("catalog.priceOnRequest") : formatINR(s.price)}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky add-to-cart at the very bottom (no tab bar on this screen) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {rateLocked ? (
            <p className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
              🔒 {t("catalog.rateAfterApproval")}
            </p>
          ) : (<>
          {product.price === null ? (
            <button
              type="button"
              onClick={() => void openPriceRequestChat(product, lang, navigate)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-secondary/50 bg-secondary/10 text-base font-semibold text-secondary-foreground transition active:scale-[0.98]"
            >
              {t("catalog.priceOnRequest")}
            </button>
          ) : qty > 0 ? (
            <>
              <div className="w-32 shrink-0">
                <QtyStepper
                  className="h-12"
                  qty={qty}
                  onDec={() => setQty(product.id, qty - 1)}
                  onInc={() => setQty(product.id, qty + 1)}
                  onSet={(n) => setQty(product.id, product.maxOrderQty != null ? Math.min(n, product.maxOrderQty) : n)}
                  max={product.maxOrderQty}
                />
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/cart" })}
                className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground shadow-md transition active:scale-[0.98]"
              >
                {t("product2.viewCart", { amount: formatINR(cartTotal) })}
              </button>
            </>
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
          </>)}
        </div>
      </div>

      {viewer && <ImageViewer src={viewer} alt={loc(product.name, lang)} onClose={() => setViewer(null)} />}
    </main>
  );
}

/** Highlight chips that drift slowly; stop while touched/focused and for reduced motion. */
function Highlights({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = 0;
    const step = (ts: number) => {
      if (!paused.current && last && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += (ts - last) * 0.03;
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) el.scrollLeft = 0;
      }
      last = ts;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [items]);
  const stop = () => (paused.current = true);
  const go = () => (paused.current = false);
  return (
    <div
      ref={ref}
      onPointerDown={stop}
      onPointerUp={go}
      onPointerLeave={go}
      onFocus={stop}
      onBlur={go}
      className="no-scrollbar mt-4 flex gap-2 overflow-x-auto"
    >
      {items.map((h, i) => (
        <span key={i} tabIndex={0} className="shrink-0 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-foreground">
          ✓ {h}
        </span>
      ))}
    </div>
  );
}

type TabKey = "desc" | "delivery" | "faq";
function InfoTabs({
  tab,
  setTab,
  sections,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  sections: { desc: string | null; delivery: string | null; faq: { q: string; a: string }[] | null };
}) {
  const { t } = useTranslation();
  const keys = (["desc", "delivery", "faq"] as const).filter((k) => sections[k]);
  if (keys.length === 0) return null;
  const active: TabKey = keys.includes(tab) ? tab : keys[0]!;
  return (
    <section className="mt-5">
      <div role="tablist" className="flex gap-1 rounded-xl bg-muted p-1">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={active === k}
            onClick={() => setTab(k)}
            className={`min-h-11 flex-1 rounded-lg text-sm font-semibold ${active === k ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            {t(`product3.tab_${k}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-3 text-sm leading-relaxed text-muted-foreground">
        {active === "faq" ? (
          <div className="space-y-2">
            {sections.faq!.map((f, i) => (
              <details key={i} className="rounded-xl border border-border bg-card px-3 py-2">
                <summary className="min-h-9 cursor-pointer py-1 font-semibold text-foreground">{f.q}</summary>
                <p className="whitespace-pre-wrap pb-1">{f.a}</p>
              </details>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{active === "desc" ? sections.desc : sections.delivery}</p>
        )}
      </div>
    </section>
  );
}

/** One line under the name: "Pack of 12 × 1 L" (never a brand, never repeated). */
function packLine(
  product: { unitsPerSellUnit: number | null; packLabel: Parameters<typeof loc>[0]; volumeMl: number | null },
  volume: string | null,
  lang: Parameters<typeof loc>[1],
  t: TFunction,
): string {
  void volume; void t;
  return formatPack(loc(product.packLabel, lang), product.unitsPerSellUnit, product.volumeMl, (product as { sellUnit?: string | null }).sellUnit);
}
