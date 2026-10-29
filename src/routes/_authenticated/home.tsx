import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  CupSoda,
  GlassWater,
  LayoutGrid,
  MapPin,
  Milk,
  Minus,
  Package,
  Plus,
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
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { getMyRegistration, type RegistrationDto } from "@/lib/registration.functions";
import { homeContent, pick, type Product } from "@/data/homeContent";

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

function ProductCard({
  product,
  qty,
  lang,
  onAdd,
  onInc,
  onDec,
}: {
  product: Product;
  qty: number;
  lang: string;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      <div className="overflow-hidden rounded-xl bg-secondary/10">
        <SmartImage
          src={product.imageUrl}
          alt={pick(product.name, lang)}
          className="aspect-square w-full object-cover"
        />
      </div>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground">
        {pick(product.name, lang)}
      </p>
      <p className="text-xs leading-tight text-muted-foreground">
        {pick(product.packLabel, lang)}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-base font-bold text-primary">₹{product.price}</span>
        {qty === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-95"
          >
            {t("home.addToCart")}
          </button>
        ) : (
          <div className="flex items-center rounded-full bg-primary text-primary-foreground">
            <button
              type="button"
              onClick={onDec}
              aria-label={t("home.decreaseQty")}
              className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              onClick={onInc}
              aria-label={t("home.increaseQty")}
              className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Home() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { quantities, setQty, clear, count } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [reg, setReg] = useState<RegistrationDto | null>(null);
  const [profile, setProfile] = useState({ name: "", photoUrl: null as string | null });
  const [addressOpen, setAddressOpen] = useState(false);
  const [openQuery, setOpenQuery] = useState<{ id: string; subject: string } | null>(null);
  const myReg = useServerFn(getMyRegistration);

  useEffect(() => {
    let active = true;
    void myReg().then((r) => {
      if (!active) return;
      setReg(r);
      setPending(r.status === "pending_approval");
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

  const { hero, banners, categories, products, sections } = homeContent;
  const deva = lang === "en" ? "" : "font-deva";

  const activeBanners = useMemo(
    () => banners.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [banners],
  );
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const activeSections = useMemo(
    () =>
      sections
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => s.key),
    [sections],
  );

  const total = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product ? sum + product.price * qty : sum;
      }, 0),
    [quantities, products],
  );

  const areaLabel = reg?.city || reg?.addressLine1 || t("home.locationArea");
  const typeLabel = reg?.typeName
    ? pick({ en: reg.typeName.en, hi: reg.typeName.hi ?? "", mr: reg.typeName.mr ?? "" }, lang)
    : "";

  const hasQuery = search.trim() !== "";
  const defaultPopularView = category === "all" && !hasQuery && !showAll;

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products
      .filter((p) => p.isActive)
      .filter((p) => category === "all" || p.categoryCode === category)
      .filter((p) => {
        if (!query) return true;
        const haystack = [p.name.en, pick(p.name, lang), pick(p.packLabel, lang)]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (defaultPopularView) return filtered.filter((p) => p.isPopular);
    return filtered;
  }, [products, category, search, lang, defaultPopularView]);

  const onBannerScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (activeBanners.length === 0 || el.scrollWidth === 0) return;
    const slide = el.scrollWidth / activeBanners.length;
    const idx = Math.round(el.scrollLeft / slide);
    setBannerIndex(Math.max(0, Math.min(activeBanners.length - 1, idx)));
  };

  const renderSection = (key: string) => {
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
                {pick(cat.name, lang)}
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
              <article
                key={banner.id}
                className="relative flex min-h-32 w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl shadow-md shadow-primary/10"
                style={
                  banner.imageUrl
                    ? undefined
                    : { background: "linear-gradient(120deg, #2EA3C7 0%, #103A66 75%)" }
                }
              >
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={pick(banner.title, lang)}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {banner.imageUrl && (
                  <div className="absolute inset-0 bg-primary/60" aria-hidden />
                )}
                <SmartImage
                  src={hero.productImageUrl}
                  alt=""
                  className="absolute -right-2 bottom-0 h-28 w-24 rotate-6 object-contain opacity-90 drop-shadow-lg"
                />
                <div className="relative z-10 flex max-w-[75%] flex-col gap-1 p-4">
                  {banner.tag && (
                    <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                      {pick(banner.tag, lang)}
                    </span>
                  )}
                  <h3 className={`text-sm font-bold leading-snug text-white ${deva}`}>
                    {pick(banner.title, lang)}
                  </h3>
                  <p className={`text-xs text-white/80 ${deva}`}>{pick(banner.subtitle, lang)}</p>
                </div>
              </article>
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
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                qty={quantities[product.id] ?? 0}
                lang={lang}
                onAdd={() => setQty(product.id, 1)}
                onInc={() => setQty(product.id, (quantities[product.id] ?? 0) + 1)}
                onDec={() => setQty(product.id, (quantities[product.id] ?? 0) - 1)}
              />
            ))}
          </div>
          {visibleProducts.length === 0 && (
            <p className={`mt-10 text-center text-sm text-muted-foreground ${deva}`}>
              {t("home.searchNoResults")}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}>
      {/* Hero */}
      <div
        className="relative px-5 pb-20 pt-6"
        style={{
          background:
            "linear-gradient(175deg, #0B2545 0%, #103A66 55%, #2EA3C7 140%)",
        }}
      >
        {hero.backgroundImageUrl && (
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
          {pick(hero.greeting, lang)}
        </h1>
        <p className={`relative z-10 mt-2.5 flex items-center gap-2 text-sm text-white/85 ${deva}`}>
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          {pick(hero.deliveryLine, lang)}
        </p>

        {/* Tilted jar with a soft glow, resting on the hero's bottom edge */}
        <div aria-hidden className="absolute bottom-3 right-1 z-10 w-36">
          <div className="absolute inset-2 -z-10 rounded-full bg-secondary/50 blur-2xl" />
          <SmartImage
            src={hero.productImageUrl}
            alt=""
            className="w-full rotate-[9deg] rounded-2xl object-cover drop-shadow-[0_16px_24px_rgba(11,37,69,0.45)]"
          />
        </div>

        {/* Soft water wave along the hero's bottom edge */}
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
          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-lg shadow-primary/5">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              aria-label={t("home.searchPlaceholder")}
              className={`h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground ${deva}`}
            />
          </div>
        </div>

        {activeSections
          .filter((key) => key !== "hero")
          .map((key) => renderSection(key))}
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
            <p className="text-sm font-semibold">{t("cart.itemsSummary", { count, total })}</p>
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

      <BottomNav />
    </main>
  );
}
