import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { useLang } from "@/hooks/use-lang";
import {
  localizedPackSize,
  localizedName,
  sampleProducts,
  type Product,
  type ProductCategory,
} from "@/data/sampleProducts";

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

type CategoryFilter = "all" | ProductCategory;

const CATEGORIES: { value: CategoryFilter; key: string }[] = [
  { value: "all", key: "home.categoryAll" },
  { value: "jars", key: "home.categoryJars" },
  { value: "bottles", key: "home.categoryBottles" },
  { value: "bulk", key: "home.categoryBulk" },
  { value: "beverages", key: "home.categoryBeverages" },
];

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
    <div className="flex animate-in flex-col rounded-2xl border border-border bg-card p-2.5 shadow-sm fade-in slide-in-from-bottom-2 duration-300">
      <div className="overflow-hidden rounded-xl bg-secondary/10">
        <img
          src={product.image}
          alt={localizedName(product, lang)}
          loading="lazy"
          width={1024}
          height={1024}
          className="aspect-square w-full object-cover"
        />
      </div>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-foreground">
        {localizedName(product, lang)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {localizedPackSize(product, lang)}
      </p>
      <div className="mt-2.5 flex items-center justify-between">
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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [initial, setInitial] = useState("S");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setInitial((data.user?.email?.[0] ?? "S").toUpperCase());
    });
    return () => {
      active = false;
    };
  }, []);

  const cartCount = useMemo(
    () => Object.values(quantities).reduce((sum, n) => sum + n, 0),
    [quantities],
  );

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sampleProducts.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (!query) return true;
      const haystack = [product.name.en, localizedName(product, lang), localizedPackSize(product, lang)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [category, search, lang]);

  const setQty = (id: string, qty: number) =>
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const deva = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}>
      {/* Hero */}
      <div
        className="relative px-5 pb-24 pt-6"
        style={{
          background:
            "linear-gradient(175deg, #0B2545 0%, #103A66 55%, #2EA3C7 140%)",
        }}
      >
        <div className="flex items-start justify-between">
          <button
            type="button"
            aria-label={`${t("home.locationLabel")}: ${t("home.locationArea")}`}
            className="flex min-h-11 items-start gap-1.5 text-left"
          >
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/80" />
            <span>
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                {t("home.locationLabel")}
                <ChevronDown className="h-4 w-4" />
              </span>
              <span className={`block text-xs text-white/70 ${deva}`}>
                {t("home.locationArea")}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`${t("home.itemsInCart")}: ${cartCount}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-white transition active:scale-95"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label={t("home.profile")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-sm font-semibold text-white transition active:scale-95"
            >
              {initial}
            </button>
          </div>
        </div>

        <h1 className="mt-9 text-3xl font-bold leading-tight text-white">
          {t("home.greeting")}
        </h1>
        <p className="mt-2.5 flex items-center gap-2 text-sm text-white/85">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          {t("home.deliveryToday")}
        </p>

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
      <div className="relative z-10 -mt-4 rounded-t-3xl bg-background pb-28">
        <div className="relative z-10 -mt-7 px-5">
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

        {/* Category chips */}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
          {CATEGORIES.map(({ value, key }) => {
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={selected}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {t(key)}
              </button>
            );
          })}
        </div>

        {/* Products */}
        <div className="mt-5 grid grid-cols-2 gap-3 px-5">
          {products.map((product) => (
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
        {products.length === 0 && (
          <p className={`mt-10 text-center text-sm text-muted-foreground ${deva}`}>
            {t("home.searchNoResults")}
          </p>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
