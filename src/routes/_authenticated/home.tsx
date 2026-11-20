import { SchemeOffers } from "@/components/SchemeOffers";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { isRefreshForeground } from "@/lib/data-refresh";
import { HeroCarousel } from "@/components/HeroCarousel";
import { sizedUrl } from "@/components/SmartImage";
import { SmartCard } from "@/components/SmartCard";
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
import { CategoryTiles } from "@/components/catalog/CategoryTiles";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SearchBox } from "@/components/catalog/SearchBox";
import { NoResultsState, ChipsSkeleton, GridSkeleton, BannerSkeleton, HeroSkeleton, ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useFavourites } from "@/hooks/use-favourites";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { fetchMyOrders, ordersChanged, useDistributorNav, type OrderDto } from "@/lib/orders";
import { onNoticeArrived, unreadNoticeCount } from "@/lib/app-notices";
import { planReorder } from "@/lib/feedback";
import { useAppSettings } from "@/lib/app-settings";
import { toast } from "sonner";
import { Repeat2, Store, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { pickupInfo } from "@/lib/catalogue";
import { getDocumentRequirements, getMyRegistration, type RegistrationDto } from "@/lib/registration.functions";
import { writeGate } from "@/lib/gate-cache";
import { readGate } from "@/lib/gate-cache";
import { useSales } from "@/lib/sales";
import { fetchKhataSummary } from "@/lib/khata";
import { publishKhataSummary } from "@/lib/catalogue";
import { readSwr, swr } from "@/lib/swr-cache";
import { useRouter } from "@tanstack/react-router";
import { hasMissingDocs, isRateLockedStatus, setRateLocked } from "@/lib/rate-lock";
import { Link } from "@tanstack/react-router";
import {
  addRecentSearch,
  fetchCatalogue,
  loadRecentSearches,
  loc,
  matchesSearch,
  onHomeExtras,
  getHomeExtras,
  readCatalogueCache,
  onCatalogue,
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
  const sales = useSales();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { isDistributor, newCount } = useDistributorNav();
  const { quantities, setQty, clear, count } = useCart();
  const offline = useOffline();
  const fav = useFavourites();

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());
  useEffect(() => onCatalogue(setData), []);
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState<string[]>(() => loadRecentSearches());
  const [pickupSheet, setPickupSheet] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [reg, setReg] = useState<RegistrationDto | null>(null);
  const [profile, setProfile] = useState({ name: "", photoUrl: null as string | null });
  const [orderUpdates, setOrderUpdates] = useState(0);
  useEffect(() => onNoticeArrived(() => void unreadNoticeCount().then(setOrderUpdates, () => undefined)), []);
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
    // Render the saved copy at once; only show skeletons when there's nothing saved.
    if (!readCatalogueCache()) setLoading(true);
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
    setRateLocked(!sales?.isSales && isRateLockedStatus(r.status));
    void supabase.auth.getSession().then(({ data }) => data.session && writeGate(data.session.user.id, r));
    if (isRateLockedStatus(r.status) && r.customerId) {
      const d = await myDocs().catch(() => null);
      setDocsMissing(d ? hasMissingDocs(d.requirements, d.uploaded) : false);
    } else setDocsMissing(false);
    return r;
  }, [myReg, myDocs, sales?.isSales]);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      const cached = data.session ? readGate(data.session.user.id) : null;
      if (cached) setReg(cached.reg);
      else void loadReg().catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  useEffect(() => {
    let active = true;
    // Local session read (no network round-trip) so this query starts with the others.
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      const data = { user: session?.user };
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
      if (!isRefreshForeground()) return;
      try {
        const has = await unreadNoticeCount();
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
  const [outForDelivery, setOutForDelivery] = useState<OrderDto | null>(null);
  const [homeExtras, setHomeExtrasState] = useState(() => getHomeExtras());
  useEffect(() => onHomeExtras(setHomeExtrasState), []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await swr("orders", fetchMyOrders);
        const done = list.filter((o) => o.status === "delivered" || o.status === "closed");
        if (!active) return;
        setLastDelivered(done[0] ?? null);
        setOutForDelivery(list.find((o) => o.status === "dispatched") ?? null);
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

  const refreshOrders = async (force = false) => {
    const list = await swr("orders", fetchMyOrders, force);
    setLastDelivered(list.find((o) => o.status === "delivered" || o.status === "closed") ?? null);
    setOutForDelivery(list.find((o) => o.status === "dispatched") ?? null);
  };
  const refreshSummary = async () => {
    await Promise.all([
      swr("khata.sum", fetchKhataSummary, true).then(publishKhataSummary),
      unreadNoticeCount().then(setOrderUpdates),
    ]);
  };
  const pollHome = async () => {
    await Promise.all([refreshSummary(), ordersChanged(readSwr<OrderDto[]>("orders") ?? []).then((changed) => changed ? refreshOrders(true) : undefined)]);
  };
  const refreshHome = async () => {
    await Promise.all([load(true), refreshSummary(),
      swr("orders", fetchMyOrders, true).then((list) => {
        setLastDelivered(list.find((o) => o.status === "delivered" || o.status === "closed") ?? null);
        setOutForDelivery(list.find((o) => o.status === "dispatched") ?? null);
      })]);
  };
  useDataRefresh(refreshHome, pollHome);
  const pull = usePullToRefresh(refreshHome);
  const deliveryBell = isDistributor && settings?.distributorDeliveryEnabled === true;

  const products = data?.products ?? [];
  const deva = lang === "en" ? "" : "font-deva";
  const pending = reg?.status === "pending_approval";

  const activeCategories = data?.categories ?? [];
  const activeBanners = (data?.banners ?? []).filter((b) => !!b.imageUrl);
  const sections = data?.sections ?? [];

  const isFav = (p: { id: string; isFavourite: boolean }) => fav.isFav(p);
  const withFav = (p: typeof products[number]) => ({ ...p, isFavourite: isFav(p) });

  const favourites = useMemo(() => products.filter((p) => fav.isFav(p)), [products, fav]);
  // "All" shows every active product; a category chip filters to its own.
  const visibleProducts = useMemo(
    () =>
      products
        .filter((p) => matchesSearch(p, search)),
    [products, search],
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
      void navigate({ to: "/category/$code", params: { code: cat?.code ?? linkValue } });
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

  const renderSection = (key: string) => {
    if (loading && (key === "categories" || key === "banners" || key === "favourites" || key === "popular")) {
      if (key === "categories") return <ChipsSkeleton key="s-categories" />;
      if (key === "banners") return <BannerSkeleton key="s-banners" />;
      if (key === "favourites") return null;
      return <GridSkeleton key="s-popular" count={2} />;
    }

    if (key === "categories") {
      const tiles = activeCategories.map((cat) => ({
        id: cat.id,
        code: cat.code,
        name: loc(cat.name, lang),
        imageUrl: cat.imageUrl ?? null,
        fallbackImage: products.find((p) => p.categoryCode === cat.code && (p.imageUrl || p.images[0]))?.imageUrl ?? products.find((p) => p.categoryCode === cat.code)?.images[0] ?? null,
      }));
      return (
        <CategoryTiles key="categories" tiles={tiles} onOpen={(code) => void navigate({ to: "/category/$code", params: { code } })} />
      );
    }

    if (key === "banners" && false) {
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
                className="relative min-h-32 w-[82%] shrink-0 snap-center overflow-hidden rounded-xl bg-primary text-left shadow-md shadow-primary/10 transition active:scale-[0.99]"
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
                    <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
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
        <div key="popular" className="px-3">
          <h2 className={`mb-2 text-base font-bold text-foreground ${deva}`}>{t("home.popularProducts")}</h2>
          <div className="grid grid-cols-2 gap-2.5">
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
          {activeBanners.length > 0 ? (
            <HeroCarousel banners={activeBanners} lang={lang} safeTop={!sales?.isSales} onOpen={(b) => openBanner(b.linkType, b.linkValue)} fallback={null}
              overlay={
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  onClick={() => setAddressOpen(true)}
                  aria-label={`${headerLabel}: ${areaLabel}`}
                  className="flex min-h-11 min-w-0 max-w-[75%] items-start gap-1.5 rounded-full bg-foreground/65 px-3 py-1.5 text-left"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground/90" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-bold text-primary-foreground">
                      {headerLabel}
                      <ChevronDown className="h-4 w-4" />
                    </span>
                    <span className={`block truncate text-xs text-primary-foreground/80 ${deva}`}>{areaLabel}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: deliveryBell ? "/inbox" : "/notifications" })}
                  aria-label={t("home.updatesBell")}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full"
                >
                  <Bell className="h-5 w-5 text-primary-foreground" />
                  {deliveryBell && newCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">{newCount > 99 ? "99+" : newCount}</span> : orderUpdates > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">{orderUpdates > 99 ? "99+" : orderUpdates}</span>}
                </button>
              </div>
              }
            />
          ) : (
          <div data-home-hero className="relative aspect-[4/3] w-full overflow-hidden bg-hero">
            {hero?.backgroundImageUrl && (
              <img src={sizedUrl(hero.backgroundImageUrl, 828)} alt="" width={828} height={621} loading="eager" fetchPriority="high" decoding="async"
                onError={(e) => { const img = e.currentTarget; if (hero.backgroundImageUrl && img.src !== hero.backgroundImageUrl) img.src = hero.backgroundImageUrl; else img.hidden = true; }}
                className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/60 to-transparent" aria-hidden />
            <div className={`absolute inset-x-0 top-0 px-4 ${sales?.isSales ? "pt-2" : "pt-[max(0.5rem,env(safe-area-inset-top))]"}`}>
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  onClick={() => setAddressOpen(true)}
                  aria-label={`${headerLabel}: ${areaLabel}`}
                  className="flex min-h-11 min-w-0 max-w-[75%] items-start gap-1.5 rounded-full bg-foreground/65 px-3 py-1.5 text-left"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground/90" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-bold text-primary-foreground">
                      {headerLabel}
                      <ChevronDown className="h-4 w-4" />
                    </span>
                    <span className={`block truncate text-xs text-primary-foreground/80 ${deva}`}>{areaLabel}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: deliveryBell ? "/inbox" : "/notifications" })}
                  aria-label={t("home.updatesBell")}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full"
                >
                  <Bell className="h-5 w-5 text-primary-foreground" />
                  {deliveryBell && newCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">{newCount > 99 ? "99+" : newCount}</span> : orderUpdates > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">{orderUpdates > 99 ? "99+" : orderUpdates}</span>}
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Content sheet sliding over the hero */}
          <div className="relative z-10 -mt-8 rounded-t-[28px] bg-background pb-44">
            <div className="relative z-30 rounded-t-[28px] bg-card px-3 pb-3 pt-3 shadow-[0_-6px_18px_-8px_rgb(11_37_69/0.25)]">
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
            {pending && (
              <div
                role="status"
                className="mx-5 mt-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground"
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

            {!loading && <div className="mt-3"><SchemeOffers products={products} /></div>}
            {!loading && homeExtras?.defaultAreaId === null && (
              <button
                type="button"
                onClick={() => setPickupSheet(true)}
                className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-[12px] bg-secondary/10 px-3 py-2 text-left"
              >
                <Store className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{t("home.noAreaShort")}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            )}
            <Sheet open={pickupSheet} onOpenChange={setPickupSheet}>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>{t("home.pickupSheetTitle")}</SheetTitle>
                  <SheetDescription>{t("home.noAreaTitle")}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3 pb-[env(safe-area-inset-bottom)] text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("home.pickupAddress")}</p>
                    <p className="font-medium text-foreground">{pickupInfo(homeExtras, lang).address ?? settings?.plantAddress ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("home.pickupHours")}</p>
                    <p className="font-medium text-foreground">{pickupInfo(homeExtras, lang).hours ?? settings?.pickupHours ?? "—"}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>


            <div className="mt-3 empty:hidden [&:not(:has(*))]:hidden">
            <SmartCard
              overdue={Number((homeExtras?.khata?.["overdue"] as number | undefined) ?? 0)}
              outForDelivery={outForDelivery}
              lastDelivered={lastDelivered}
              thumb={(pid) => {
                const p = products.find((x) => x.id === pid);
                return p?.imageUrl ?? p?.images[0] ?? null;
              }}
              onPay={() => navigate({ to: "/khata/pay" })}
              onTrack={(id) => navigate({ to: "/track/$id", params: { id } })}
              onReorder={orderAgain}
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

          <CartBar
            items={Object.keys(quantities).length}
            packs={count}
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
