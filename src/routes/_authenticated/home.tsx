import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  CupSoda,
  GlassWater,
  Heart,
  LayoutGrid,
  MapPin,
  Milk,
  Package,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { SmartImage } from "@/components/SmartImage";
import { AddressSheet } from "@/components/AddressSheet";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ClearCartDialog } from "@/components/ClearCartDialog";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SearchBox } from "@/components/catalog/SearchBox";
import { NoResultsState, ChipsSkeleton, GridSkeleton, BannerSkeleton, HeroSkeleton, ErrorState } from "@/components/catalog/states";
import { JAR_HERO_IMAGE, fallbackImageFor } from "@/components/catalog/image-fallbacks";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useFavourites } from "@/hooks/use-favourites";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { getMyRegistration, type RegistrationDto } from "@/lib/registration.functions";
import {
  addRecentSearch,
  fetchCatalogue,
  formatINR,
  loadRecentSearches,
  loc,
  matchesSearch,
  readCatalogueCache,
  type CatalogData,
} from "@/lib/catalogue";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: en.home.metaTitle },
      { name: "description", content: en.home.metaDescription },
      { property: "og:title", content: en.home.metaTitle },
      { property: "og:description", content: en.home.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  grid: LayoutGrid,
  jar: GlassWater,
  bottle: Milk,
  box: Package,
  glass: CupSoda,
};

function Home() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { quantities, setQty, clear, count } = useCart();
  const offline = useOffline();
  const fav = useFavourites();

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState<string[]>(() => loadRecentSearches());
  const [category, setCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [reg, setReg] = useState<RegistrationDto | null>(null);
  const [profile, setProfile] = useState({ name: "", photoUrl: null as string | null });
  const [addressOpen, setAddressOpen] = useState(false);
  const [openQuery, setOpenQuery] = useState<{ id: string; subject: string } | null>(null);
  const myReg = useServerFn(getMyRegistration);

  const load = useCallback(async () => {
    try {
      const fresh = await fetchCatalogue();
      setData(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
      throw e;
    }
  }, []);

  // Cache first, then refresh silently; a failure keeps the cached view.
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

  useEffect(() => {
    let active = true;
    void myReg().then((r) => {
      if (!active) return;
      setReg(r);
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: p } = await supabase
        .from("user_profiles")
        .select("full_name, photo_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active && p) setProfile({ name: p.full_name ?? "", photoUrl: p.photo_url ?? null });
    });
    return () => {
      active = false;
    };
  }, []);

  const loadOpenQuery = useCallback(async () => {
    const { data } = await supabase
      .from("customer_queries")
      .select("id, subject")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);
    setOpenQuery(data?.[0] ? { id: data[0].id, subject: data[0].subject } : null);
  }, []);

  useEffect(() => {
    void loadOpenQuery();
    const id = setInterval(() => void loadOpenQuery(), 60_000);
    return () => clearInterval(id);
  }, [loadOpenQuery]);

  const pull = usePullToRefresh(load);

  const products = data?.products ?? [];
  const deva = lang === "en" ? "" : "font-deva";
  const pending = reg?.status === "pending_approval";

  const activeCategories = data?.categories ?? [];
  const activeBanners = data?.banners ?? [];
  const sections = data?.sections ?? [];

  const isFav = (p: { id: string; isFavourite: boolean }) => fav.isFav(p);
  const withFav = (p: typeof products[number]) => ({ ...p, isFavourite: isFav(p) });

  const favourites = useMemo(() => products.filter((p) => fav.isFav(p)), [products, fav]);
  const popular = useMemo(() => products.filter((p) => p.isPopular), [products]);

  const hasQuery = search.trim() !== "";
  const defaultPopularView = category === "all" && !hasQuery;

  const visibleProducts = useMemo(() => {
    const filtered = products
      .filter((p) => category === "all" || p.categoryCode === category)
      .filter((p) => matchesSearch(p, search));
    return defaultPopularView ? filtered.filter((p) => p.isPopular) : filtered;
  }, [products, category, search, defaultPopularView]);

  const total = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product?.price != null ? sum + product.price * qty : sum;
      }, 0),
    [quantities, products],
  );

  const areaLabel = reg?.city || reg?.addressLine1 || t("home.locationArea");
  const typeLabel = reg?.typeName ? loc(reg.typeName, lang) : "";

  const openBanner = (linkType: string, linkValue: string | null) => {
    if (linkType === "url" && linkValue) {
      window.open(linkValue, "_blank", "noopener");
      return;
    }
    if (linkType === "category" && linkValue) {
      const cat = activeCategories.find((c) => c.code === linkValue || c.id === linkValue);
      void navigate({ to: "/order", search: { category: cat?.code ?? linkValue } });
      return;
    }
    if (linkType === "product" && linkValue) {
      const p = products.find((x) => x.id === linkValue || x.code === linkValue);
      if (p) void navigate({ to: "/product/$id", params: { id: p.id } });
    }
  };

  const onBannerScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (activeBanners.length === 0 || el.scrollWidth === 0) return;
    const slide = el.scrollWidth / activeBanners.length;
    const idx = Math.round(el.scrollLeft / slide);
    setBannerIndex(Math.max(0, Math.min(activeBanners.length - 1, idx)));
  };

  const hero = data?.hero ?? null;
  const heroProductImage = hero?.productImageUrl ?? JAR_HERO_IMAGE;
  const heroGreeting = hero?.greeting ? loc(hero.greeting, lang) : t("home.greeting");
  const heroDelivery = hero?.deliveryLine ? loc(hero.deliveryLine, lang) : t("home.deliveryToday");

  const renderSection = (key: string) => {
    if (loading && (key === "categories" || key === "banners" || key === "favourites" || key === "popular")) {
      if (key === "categories") return <ChipsSkeleton key="s-categories" />;
      if (key === "banners") return <BannerSkeleton key="s-banners" />;
      if (key === "favourites") return null;
      return <GridSkeleton key="s-popular" count={2} />;
    }

    if (key === "categories") {
      return (
        <div key="categories" className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setShowAll(false);
            }}
            aria-pressed={category === "all"}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${
              category === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border bg-card text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            {t("home.categoryAll")}
          </button>
          {activeCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.iconKey] ?? LayoutGrid;
            const selected = category === cat.code;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.code);
                  setShowAll(true);
                }}
                aria-pressed={selected}
                className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {loc(cat.name, lang)}
              </button>
            );
          })}
        </div>
      );
    }

    if (key === "banners" && activeBanners.length > 0) {
      return (
        <div key="banners" className="mt-5">
          <div
            className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5"
            onScroll={onBannerScroll}
          >
            {activeBanners.map((banner) => (
              <button
                type="button"
                key={banner.id}
                onClick={() => openBanner(banner.linkType, banner.linkValue)}
                className="relative min-h-32 w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl text-left shadow-md shadow-primary/10 transition active:scale-[0.99]"
                style={
                  banner.imageUrl
                    ? undefined
                    : { background: "linear-gradient(120deg, #2EA3C7 0%, #103A66 75%)" }
                }
              >
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={loc(banner.title, lang)}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {banner.imageUrl && <div className="absolute inset-0 bg-primary/60" aria-hidden />}
                <SmartImage
                  src={heroProductImage}
                  alt=""
                  className="absolute -right-2 bottom-0 h-28 w-24 rotate-6 object-contain opacity-90 drop-shadow-lg"
                />
                <div className="relative z-10 flex max-w-[75%] flex-col gap-1 p-4">
                  {banner.tag && (
                    <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                      {loc(banner.tag, lang)}
                    </span>
                  )}
                  <h3 className={`text-sm font-bold leading-snug text-white ${deva}`}>{loc(banner.title, lang)}</h3>
                  {banner.subtitle && (
                    <p className={`text-xs text-white/80 ${deva}`}>{loc(banner.subtitle, lang)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          {activeBanners.length > 1 && (
            <div className="mt-2.5 flex justify-center gap-1.5 px-5">
              {activeBanners.map((banner, i) => (
                <span
                  key={banner.id}
                  aria-hidden
                  className={`h-1.5 rounded-full transition-all ${
                    i === bannerIndex ? "w-4 bg-primary" : "w-1.5 bg-primary/25"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (key === "favourites" && favourites.length > 0) {
      return (
        <div key="favourites" className="mt-6 px-5">
          <h2 className={`flex items-center gap-1.5 text-lg font-bold text-foreground ${deva}`}>
            <Heart className="h-5 w-5 text-destructive" aria-hidden />
            {t("catalog.yourFavourites")}
          </h2>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {favourites.map((product) => {
              const p = withFav(product);
              return (
                <div key={product.id} className="w-40 shrink-0">
                  <ProductCard
                    product={p}
                    qty={quantities[product.id] ?? 0}
                    lang={lang}
                    canOrder={p.canOrder}
                    offline={offline}
                    onOpen={() => void navigate({ to: "/product/$id", params: { id: p.id } })}
                    onAdd={() => {
                      setQty(p.id, p.minOrderQty || 1);
                      if (p.price != null) import("@/lib/catalogue").then((m) => m.saveCartPrice(p.id, p.price));
                    }}
                    onInc={() => {
                      const max = p.maxOrderQty ?? Infinity;
                      const next = Math.min((quantities[p.id] ?? 0) + 1, max);
                      setQty(p.id, next);
                    }}
                    onDec={() => setQty(p.id, (quantities[p.id] ?? 0) - 1)}
                    onToggleFavourite={() => void fav.toggle(p)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (key === "popular") {
      return (
        <div key="popular" className="mt-6 px-5">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-bold text-foreground ${deva}`}>
              {t(defaultPopularView ? "home.popularTitle" : "home.allProducts")}
            </h2>
            {defaultPopularView ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="min-h-9 text-sm font-semibold text-secondary"
              >
                {t("home.seeAll")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowAll(false);
                  setCategory("all");
                }}
                className="min-h-9 text-sm font-semibold text-secondary"
              >
                {t("home.showLess")}
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {visibleProducts.map((product) => {
              const p = withFav(product);
              return (
                <ProductCard
                  key={product.id}
                  product={p}
                  qty={quantities[product.id] ?? 0}
                  lang={lang}
                  canOrder={p.canOrder}
                  offline={offline}
                  onOpen={() => void navigate({ to: "/product/$id", params: { id: p.id } })}
                  onAdd={() => {
                    setQty(p.id, p.minOrderQty || 1);
                    if (p.price != null) import("@/lib/catalogue").then((m) => m.saveCartPrice(p.id, p.price));
                  }}
                  onInc={() => {
                    const max = p.maxOrderQty ?? Infinity;
                    setQty(p.id, Math.min((quantities[p.id] ?? 0) + 1, max));
                  }}
                  onDec={() => setQty(p.id, (quantities[p.id] ?? 0) - 1)}
                  onToggleFavourite={() => void fav.toggle(p)}
                />
              );
            })}
          </div>
          {!loading && visibleProducts.length === 0 && <NoResultsState />}
          {hasQuery && visibleProducts.length > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("catalog.resultsCount", { count: visibleProducts.length })}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  const showError = !loading && !data;
  const showEmptyCatalog = !loading && data !== null && data.products.length === 0;

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}
      onTouchStart={pull.handlers.onTouchStart}
      onTouchMove={pull.handlers.onTouchMove}
      onTouchEnd={pull.handlers.onTouchEnd}
      onTouchCancel={pull.handlers.onTouchCancel}
    >
      <OfflineBanner />

      {pull.indicator && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center"
          style={{ transform: `translateY(${Math.max(0, pull.offset - 16)}px)` }}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md ${pull.spinning ? "animate-spin" : ""}`}
          >
            <ArrowRight className="h-4 w-4 rotate-90 text-secondary" />
          </span>
        </div>
      )}

      {showError ? (
        <ErrorState message={loadError} onRetry={() => void load().catch(() => undefined)} />
      ) : (
        <>
          {/* Hero */}
          <div
            className="relative px-5 pb-20 pt-6"
            style={{
              background: "linear-gradient(175deg, #0B2545 0%, #103A66 55%, #2EA3C7 140%)",
            }}
          >
            {hero?.backgroundImageUrl && (
              <>
                <img
                  src={hero.backgroundImageUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/70" aria-hidden />
              </>
            )}
            {loading && !hero?.backgroundImageUrl && <HeroSkeleton />}

            {!loading && (
              <>
                {/* Soft rising bubbles */}
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  <span className="animate-bubble absolute bottom-16 left-8 h-8 w-8 rounded-full bg-white/10" />
                  <span
                    className="animate-bubble absolute bottom-24 left-1/3 h-5 w-5 rounded-full bg-white/10"
                    style={{ animationDelay: "1.2s" }}
                  />
                  <span
                    className="animate-bubble absolute bottom-10 left-2/3 h-10 w-10 rounded-full bg-white/10"
                    style={{ animationDelay: "2.4s" }}
                  />
                  <span
                    className="animate-bubble absolute bottom-20 right-10 h-6 w-6 rounded-full bg-white/10"
                    style={{ animationDelay: "0.6s" }}
                  />
                </div>

                <div className="relative z-10 flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => setAddressOpen(true)}
                    aria-label={`${t("home.locationLabel")}: ${areaLabel}`}
                    className="flex min-h-11 items-start gap-1.5 text-left"
                  >
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/80" />
                    <span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-white">
                        {t("home.locationLabel")}
                        <ChevronDown className="h-4 w-4" />
                      </span>
                      <span className={`block text-xs text-white/70 ${deva}`}>{areaLabel}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate({ to: "/account" })}
                    aria-label={t("home.profile")}
                    className="rounded-full transition active:scale-95"
                  >
                    <ProfileAvatar
                      src={profile.photoUrl}
                      name={profile.name}
                      className="h-10 w-10 border border-white/30 text-sm"
                    />
                  </button>
                </div>

                <h1 className={`relative z-10 mt-6 max-w-[65%] text-3xl font-bold leading-tight text-white ${deva}`}>
                  {heroGreeting}
                </h1>
                <p className={`relative z-10 mt-2.5 flex items-center gap-2 text-sm text-white/85 ${deva}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  {heroDelivery}
                </p>

                <div aria-hidden className="absolute bottom-3 right-1 z-10 w-36">
                  <div className="absolute inset-2 -z-10 rounded-full bg-secondary/50 blur-2xl" />
                  <SmartImage
                    src={heroProductImage}
                    alt=""
                    className="w-full rotate-[9deg] rounded-2xl object-cover drop-shadow-[0_16px_24px_rgba(11,37,69,0.45)]"
                  />
                </div>

                <svg
                  className="absolute inset-x-0 bottom-0 h-12 w-full text-white/10"
                  viewBox="0 0 390 48"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M0 26 C 70 46 140 8 225 16 C 300 23 345 38 390 20 L390 48 L0 48 Z"
                    fill="currentColor"
                  />
                </svg>
                <svg
                  className="absolute inset-x-0 bottom-0 h-6 w-full"
                  viewBox="0 0 390 24"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M0 12 C 80 24 180 2 280 10 C 330 14 360 20 390 12 L390 24 L0 24 Z"
                    className="fill-background"
                  />
                </svg>
              </>
            )}
          </div>

          {/* Content sheet sliding over the hero */}
          <div className="relative z-10 -mt-4 rounded-t-3xl bg-background pb-44">
            {pending && (
              <div
                role="status"
                className="mx-5 mb-4 flex items-start gap-2 rounded-xl bg-accent/15 px-4 py-3 text-sm font-medium text-foreground"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {t("banner.underReview")}
              </div>
            )}
            {openQuery && (
              <div className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{t("home.needsAction")}</p>
                  <p className="truncate text-xs text-muted-foreground">{openQuery.subject}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/queries/$id", params: { id: openQuery.id } })}
                  className="min-h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition active:scale-95"
                >
                  {t("home.open")}
                </button>
              </div>
            )}
            <div className="relative z-30 -mt-7 px-5">
              <SearchBox
                value={search}
                onChange={setSearch}
                onSubmit={(v) => {
                  addRecentSearch(v);
                  setRecents(loadRecentSearches());
                }}
                recents={recents}
                onPickRecent={(v) => setSearch(v)}
              />
            </div>

            {showEmptyCatalog ? (
              <div className="px-5">
                <NoResultsState />
              </div>
            ) : (
              sections
                .filter((key) => key !== "hero")
                .map((key) => renderSection(key))
            )}
          </div>

          {/* Zomato-style floating cart bar */}
          {count > 0 && (
            <div className="fixed inset-x-0 bottom-[4.75rem] z-40 px-4">
              <div className="relative mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl shadow-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  type="button"
                  aria-label={t("cart.clear")}
                  onClick={() => setConfirmClear(true)}
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold">{t("cart.itemsSummary", { count, total: formatINR(total) })}</p>
                {pending ? (
                  <span className="flex min-h-11 items-center rounded-xl bg-primary-foreground/15 px-4 text-sm font-bold text-primary-foreground">
                    {t("cart.orderingAfterApproval")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/cart" })}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-4 text-sm font-bold text-primary-foreground transition active:scale-95"
                  >
                    {t("cart.viewCart")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <ClearCartDialog
            open={confirmClear}
            onOpenChange={setConfirmClear}
            onConfirm={() => {
              clear();
              setConfirmClear(false);
            }}
          />

          <AddressSheet
            open={addressOpen}
            onOpenChange={setAddressOpen}
            address={
              reg
                ? {
                    line1: reg.addressLine1 ?? "",
                    line2: reg.addressLine2,
                    landmark: reg.landmark,
                    city: reg.city,
                    pincode: reg.pincode,
                    lat: reg.latitude,
                    lng: reg.longitude,
                  }
                : null
            }
            typeLabel={typeLabel}
          />
        </>
      )}

      <BottomNav />
    </main>
  );
}
