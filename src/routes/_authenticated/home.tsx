import { sizedUrl } from "@/components/SmartImage";
import { markFirstScreen } from "@/lib/native";
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { PageShell } from "@/components/PageShell";
import { serverMessage } from "@/lib/form-errors";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Clock,
  CupSoda,
  GlassWater,
  Heart,
  LayoutGrid,
  MapPin,
  Milk,
  Gem,
  Package,
  type LucideIcon,
} from "lucide-react";
import { CartBar } from "@/components/CartBar";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { SmartImage } from "@/components/SmartImage";
import { AddressSwitcher } from "@/components/AddressSwitcher";
import { PayReminder } from "@/components/PayReminder";
import { KhataPayShortcut } from "@/components/KhataPayShortcut";
import { listMyAddresses, mapAddressRow, labelKey, type SavedAddress } from "@/lib/addresses";
import { pickSelected, shortArea, useSelectedAddressId } from "@/lib/selected-address";
import { ClearCartDialog } from "@/components/ClearCartDialog";
import { ProductCard } from "@/components/catalog/ProductCard";
import { openPriceRequestChat } from "@/lib/price-request";
import { SearchBox } from "@/components/catalog/SearchBox";
import { NoResultsState, ChipsSkeleton, GridSkeleton, BannerSkeleton, HeroSkeleton, ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useFavourites } from "@/hooks/use-favourites";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { fetchMyOrders, type OrderDto } from "@/lib/orders";
import { hasUnreadNotices } from "@/lib/notifications";
import { fetchMyFeedback, planReorder, skippedRatings } from "@/lib/feedback";
import { RateOrderCard } from "@/components/RateOrderCard";
import { useAppSettings } from "@/lib/app-settings";
import { toast } from "sonner";
import { Repeat2 } from "lucide-react";
import { getDocumentRequirements, getMyRegistration, type RegistrationDto } from "@/lib/registration.functions";
import { writeGate } from "@/lib/gate-cache";
import { swr } from "@/lib/swr-cache";
import { useRouter } from "@tanstack/react-router";
import { hasMissingDocs, isRateLockedStatus, setRateLocked } from "@/lib/rate-lock";
import { Link } from "@tanstack/react-router";
import {
  addRecentSearch,
  fetchCatalogue,
  formatINR,
  loadRecentSearches,
  loc,
  matchesSearch,
  onHomeExtras,
  readCatalogueCache,
  saveCartPrice,
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
  useEffect(() => markFirstScreen(), []);
  const routerForPreload = useRouter();
  // After Home shows, load the other main tabs' code (and orders data) in the background.
  useEffect(() => {
    const id = setTimeout(() => {
      for (const to of ["/track", "/account", "/khata", "/cart"] as const) {
        void routerForPreload.preloadRoute({ to }).catch(() => undefined);
      }
      void swr("orders", fetchMyOrders).catch(() => undefined);
    }, 1200);
    return () => clearTimeout(id);
  }, [routerForPreload]);
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
  const [confirmClear, setConfirmClear] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [reg, setReg] = useState<RegistrationDto | null>(null);
  const [profile, setProfile] = useState({ name: "", photoUrl: null as string | null });
  const [orderUpdates, setOrderUpdates] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addrList, setAddrList] = useState<SavedAddress[]>([]);
  const selectedId = useSelectedAddressId();
  const loadAddresses = useCallback(async () => {
    try {
      setAddrList(await listMyAddresses());
    } catch {
      /* header falls back to the registered address */
    }
  }, []);
  // Header uses get_home()'s default address; the full list loads only when
  // the customer picked another address or opens the address sheet.
  useEffect(() => {
    let got = false;
    const off = onHomeExtras((x) => {
      if (got) return;
      got = true;
      const def = x.defaultAddress ? mapAddressRow(x.defaultAddress) : null;
      if (def && (!selectedId || selectedId === def.id)) setAddrList((cur) => (cur.length ? cur : [def]));
      else if (selectedId) void loadAddresses();
    });
    const timer = setTimeout(() => {
      if (!got) void loadAddresses();
    }, 2500);
    return () => {
      off();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAddresses]);
  useEffect(() => {
    if (addressOpen) void loadAddresses();
  }, [addressOpen, loadAddresses]);
  const myReg = useServerFn(getMyRegistration);

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

  const myDocs = useServerFn(getDocumentRequirements);
  const [docsMissing, setDocsMissing] = useState(false);
  const loadReg = useCallback(async () => {
    const r = await myReg();
    setReg(r);
    setRateLocked(isRateLockedStatus(r.status));
    void supabase.auth.getSession().then(({ data }) => data.session && writeGate(data.session.user.id, r));
    if (isRateLockedStatus(r.status) && r.customerId) {
      const d = await myDocs().catch(() => null);
      setDocsMissing(d ? hasMissingDocs(d.requirements, d.uploaded) : false);
    } else setDocsMissing(false);
    return r;
  }, [myReg, myDocs]);
  useEffect(() => {
    let active = true;
    void loadReg().catch(() => undefined);
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

  // In-app update bell (Task 7): dot when an order changed since My orders was last opened.
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const has = await hasUnreadNotices();
        if (active) setOrderUpdates(has);
      } catch {
        /* offline — keep current state */
      }
    };
    void check();
    const id = setInterval(() => void check(), 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Order again + rate last delivery (Tasks 5 & 6).
  const settings = useAppSettings();
  const [lastDelivered, setLastDelivered] = useState<OrderDto | null>(null);
  const [rateOrder, setRateOrder] = useState<OrderDto | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await fetchMyOrders();
        const done = list.filter((o) => o.status === "delivered" || o.status === "closed");
        if (!active) return;
        setLastDelivered(done[0] ?? null);
        const recent = done.slice(0, 5);
        const fb = await fetchMyFeedback(recent.map((o) => o.id));
        const skipped = skippedRatings();
        if (active) setRateOrder(recent.find((o) => !fb[o.id] && !skipped.includes(o.id)) ?? null);
      } catch {
        /* offline — skip */
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const orderAgain = () => {
    if (!lastDelivered) return;
    const { add, skipped } = planReorder(lastDelivered.lines, data?.products ?? []);
    if (add.length === 0) {
      toast.error(t("reorder.noneAvailable"));
      return;
    }
    for (const l of add) setQty(l.productId, l.qty);
    if (skipped > 0) toast(t("reorder.someSkipped", { count: skipped }));
    void navigate({ to: "/cart" });
  };

  const pull = usePullToRefresh(() => Promise.all([load(true), loadReg()]));

  const products = data?.products ?? [];
  const deva = lang === "en" ? "" : "font-deva";
  const pending = reg?.status === "pending_approval";

  const activeCategories = data?.categories ?? [];
  const activeBanners = (data?.banners ?? []).filter((b) => b.imageUrl || b.title.en.trim() !== "");
  const sections = data?.sections ?? [];

  const isFav = (p: { id: string; isFavourite: boolean }) => fav.isFav(p);
  const withFav = (p: typeof products[number]) => ({ ...p, isFavourite: isFav(p) });

  const favourites = useMemo(() => products.filter((p) => fav.isFav(p)), [products, fav]);
  // "All" shows every active product; a category chip filters to its own.
  const visibleProducts = useMemo(
    () =>
      products
        .filter((p) => category === "all" || p.categoryCode === category)
        .filter((p) => matchesSearch(p, search)),
    [products, category, search],
  );

  const total = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product?.price != null ? sum + product.price * qty : sum;
      }, 0),
    [quantities, products],
  );

  const selectedAddr = pickSelected(addrList, selectedId);
  const headerLabel = selectedAddr ? t(labelKey(selectedAddr.label)) : t("addresses.labels.shop");
  const areaLabel = selectedAddr
    ? shortArea(selectedAddr)
    : [reg?.addressLine2 || reg?.landmark || reg?.addressLine1, reg?.city].filter(Boolean).join(", ") || t("home.locationArea");

  const openBanner = (linkType: string, linkValue: string | null) => {
    if (linkType === "url" && linkValue) {
      window.open(linkValue, "_blank", "noopener");
      return;
    }
    if (linkType === "category" && linkValue) {
      const cat = activeCategories.find((c) => c.code === linkValue || c.id === linkValue);
      setCategory(cat?.code ?? linkValue);
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
  const heroProductImage = hero?.productImageUrl ?? null;
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
        <div key="categories" className="no-scrollbar sticky top-0 z-20 mt-3 flex gap-2 overflow-x-auto bg-background px-5 py-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
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
            const Icon = /premium/i.test(`${cat.code} ${loc(cat.name, "en")}`) ? Gem : (CATEGORY_ICONS[cat.iconKey] ?? LayoutGrid);
            const selected = category === cat.code;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.code)}
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
                className="relative min-h-32 w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl bg-primary text-left shadow-md shadow-primary/10 transition active:scale-[0.99]"
              >
                {banner.imageUrl && (
                  <img
                    src={sizedUrl(banner.imageUrl, 400)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const img = e.currentTarget;
                      // Resized copy unavailable: fall back to the original once, then hide.
                      if (banner.imageUrl && img.src !== banner.imageUrl && !img.dataset["plain"]) {
                        img.dataset["plain"] = "1";
                        img.src = banner.imageUrl;
                      } else img.style.display = "none";
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/60 to-primary/10" aria-hidden />
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

    if (key === "favourites" && false) {
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
                      if (p.price != null) saveCartPrice(p.id, p.price);
                    }}
                    onPriceRequest={() => void openPriceRequestChat(p, lang, navigate)}
                    onInc={() => {
                      const max = p.maxOrderQty ?? Infinity;
                      const next = Math.min((quantities[p.id] ?? 0) + 1, max);
                      setQty(p.id, next);
                    }}
                    onDec={() => setQty(p.id, (quantities[p.id] ?? 0) - 1)}
                  onSetQty={(n) => setQty(p.id, p.maxOrderQty != null ? Math.min(n, p.maxOrderQty) : n)}
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
          <h2 className={`text-lg font-bold text-foreground ${deva}`}>{t("home.allProducts")}</h2>


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
                    if (p.price != null) saveCartPrice(p.id, p.price);
                  }}
                  onPriceRequest={() => void openPriceRequestChat(p, lang, navigate)}
                  onInc={() => {
                    const max = p.maxOrderQty ?? Infinity;
                    setQty(p.id, Math.min((quantities[p.id] ?? 0) + 1, max));
                  }}
                  onDec={() => setQty(p.id, (quantities[p.id] ?? 0) - 1)}
                  onSetQty={(n) => setQty(p.id, p.maxOrderQty != null ? Math.min(n, p.maxOrderQty) : n)}
                />
              );
            })}
          </div>
          {!loading && visibleProducts.length === 0 && <NoResultsState />}
        </div>
      );
    }

    return null;
  };

  const showError = !loading && !data;
  const showEmptyCatalog = !loading && data !== null && data.products.length === 0;

  return (
    <PageShell
      className={` ${deva}`}
      onTouchStart={pull.handlers.onTouchStart}
      onTouchMove={pull.handlers.onTouchMove}
      onTouchEnd={pull.handlers.onTouchEnd}
      onTouchCancel={pull.handlers.onTouchCancel}
    >
      <PayReminder />
      <KhataPayShortcut />

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
        <ErrorState message={loadError} onRetry={() => void load(true).catch(() => undefined)} />
      ) : (
        <>
          {/* Hero */}
          <div className="bg-hero relative px-5 pb-20 pt-6">
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
                    aria-label={`${headerLabel}: ${areaLabel}`}
                    className="flex min-h-11 min-w-0 max-w-[75%] items-start gap-1.5 text-left"
                  >
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/80" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm font-bold text-white">
                        {headerLabel}
                        <ChevronDown className="h-4 w-4" />
                      </span>
                      <span className={`block truncate text-xs text-white/70 ${deva}`}>{areaLabel}</span>
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/notifications" })}
                      aria-label={t("home.updatesBell")}
                      className="relative flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
                    >
                      <Bell className="h-5 w-5 text-white" />
                      {orderUpdates && (
                        <span
                          aria-hidden
                          className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-accent"
                        />
                      )}
                    </button>
                  </div>
                </div>

                <h1 className={`relative z-10 mt-6 max-w-[65%] text-3xl font-bold leading-tight text-white ${deva}`}>
                  {heroGreeting}
                </h1>
                <p className={`relative z-10 mt-2.5 flex items-center gap-2 text-sm text-white/85 ${deva}`}>
                  {heroDelivery}
                </p>

                {heroProductImage && (
                <div aria-hidden className="absolute bottom-3 right-1 z-10 w-36">
                  <div className="absolute inset-2 -z-10 rounded-full bg-secondary/50 blur-2xl" />
                  <SmartImage
                    src={heroProductImage}
                    alt=""
                    width={144}
                    eager
                    className="w-full rotate-[9deg] rounded-2xl object-cover drop-shadow-[0_16px_24px_rgba(11,37,69,0.45)]"
                  />
                </div>
                )}

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
                className="mx-5 mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground"
              >
                <p className="flex items-start gap-2 font-medium">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {t("banner.verifying")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {docsMissing && (
                    <Link
                      to="/registration"
                      search={{ docs: 1 }}
                      className="flex min-h-11 items-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground"
                    >
                      {t("banner.uploadDocs")}
                    </Link>
                  )}
                  {settings?.supportPhone && (
                    <a
                      href={`tel:${settings.supportPhone}`}
                      className="flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-xs font-bold text-foreground"
                    >
                      {t("banner.call")}
                    </a>
                  )}
                  {(settings?.supportWhatsapp || settings?.supportPhone) && (
                    <a
                      href={`https://wa.me/${(settings.supportWhatsapp || settings.supportPhone || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-xs font-bold text-foreground"
                    >
                      {t("banner.whatsapp")}
                    </a>
                  )}
                </div>
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

            <div className="mt-4 empty:hidden">
            {settings?.feedbackEnabled !== false && rateOrder && (
              <div className="mx-5 mb-4">
                <RateOrderCard allowSkip orderId={rateOrder.id} orderNo={rateOrder.orderNo} onDone={() => setRateOrder(null)} />
              </div>
            )}
            {lastDelivered && count === 0 && (
              <button
                type="button"
                onClick={orderAgain}
                className="mx-5 mb-4 flex min-h-14 w-[calc(100%-2.5rem)] items-center gap-3 rounded-xl border border-secondary/30 bg-card px-4 text-left shadow-sm transition active:scale-[0.98]"
              >
                <Repeat2 className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{t("reorder.title")}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t("reorder.sub", { no: lastDelivered.orderNo, count: lastDelivered.lines.length })}
                  </span>
                </span>
              </button>
            )}
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

          <CartBar
            count={count}
            total={formatINR(total)}
            pending={pending}
            onOpen={() => void navigate({ to: "/cart" })}
            onClear={() => setConfirmClear(true)}
          />

          <ClearCartDialog
            open={confirmClear}
            onOpenChange={setConfirmClear}
            onConfirm={() => {
              clear();
              setConfirmClear(false);
            }}
          />

          <AddressSwitcher
            open={addressOpen}
            onOpenChange={setAddressOpen}
            list={addrList}
            selectedId={selectedAddr?.id ?? null}
            onChanged={loadAddresses}
          />
        </>
      )}

      <BottomNav />
    </PageShell>
  );
}
