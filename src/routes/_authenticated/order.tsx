import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow, CupSoda, GlassWater, LayoutGrid, Milk, Package, type LucideIcon } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SearchBox } from "@/components/catalog/SearchBox";
import { ChipsSkeleton, EmptyState, ErrorState, GridSkeleton, NoResultsState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useFavourites } from "@/hooks/use-favourites";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  addRecentSearch,
  fetchCatalogue,
  formatINR,
  loadRecentSearches,
  loc,
  matchesSearch,
  readCatalogueCache,
  saveCartPrice,
  type CatalogData,
} from "@/lib/catalogue";

export const Route = createFileRoute("/_authenticated/order")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search["category"] === "string" ? search["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: en.order.metaTitle },
      { name: "description", content: en.order.metaDescription },
      { property: "og:title", content: en.order.metaTitle },
      { property: "og:description", content: en.order.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Order,
});

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  grid: LayoutGrid,
  jar: GlassWater,
  bottle: Milk,
  box: Package,
  glass: CupSoda,
};

type Sort = "arranged" | "popular" | "price_asc" | "price_desc";

function Order() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { category } = Route.useSearch();
  const navigate = useNavigate();
  const { quantities, setQty } = useCart();
  const offline = useOffline();
  const fav = useFavourites();

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState<string[]>(() => loadRecentSearches());
  const [sort, setSort] = useState<Sort>("arranged");
  const [selected, setSelected] = useState<string>(category ?? "all");

  useEffect(() => {
    if (category) setSelected(category);
  }, [category]);

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

  const pull = usePullToRefresh(() => load(true));

  const products = data?.products ?? [];
  const deva = lang === "en" ? "" : "font-deva";
  const categories = data?.categories ?? [];

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const c = p.categoryCode ?? "other";
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const visible = useMemo(() => {
    let list = products.filter((p) => selected === "all" || p.categoryCode === selected).filter((p) => matchesSearch(p, search));
    if (sort === "arranged") {
      // Catalogue already arrives in Command Center order.
    } else if (sort === "popular") {
      list = [...list].sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || a.sortOrder - b.sortOrder);
    } else if (sort === "price_asc") {
      list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else {
      list = [...list].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }
    return list;
  }, [products, selected, search, sort]);

  // "All" + arranged + no search: one section per category, as set in Command Center.
  const sections = useMemo(() => {
    if (selected !== "all" || sort !== "arranged" || search.trim() !== "") return [{ key: "all", cat: null, items: visible }];
    const out = categories
      .map((cat) => ({ key: cat.code, cat, items: visible.filter((p) => p.categoryCode === cat.code) }))
      .filter((s) => s.items.length > 0);
    const known = new Set(categories.map((c) => c.code));
    const rest = visible.filter((p) => !known.has(p.categoryCode ?? ""));
    if (rest.length) out.push({ key: "other", cat: null, items: rest } as never);
    return out as { key: string; cat: (typeof categories)[number] | null; items: typeof visible }[];
  }, [selected, sort, search, categories, visible]);

  const showError = !loading && !data;

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}
      onTouchStart={pull.handlers.onTouchStart}
      onTouchMove={pull.handlers.onTouchMove}
      onTouchEnd={pull.handlers.onTouchEnd}
      onTouchCancel={pull.handlers.onTouchCancel}
    >
      <OfflineBanner />

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 pb-3 pt-7 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary">{t("order.title")}</h1>
        <div className="mt-3">
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
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelected("all")}
            aria-pressed={selected === "all"}
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${
              selected === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            {t("home.categoryAll")}
            {counts.size > 0 && <span className="text-xs opacity-75">{products.length}</span>}
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.iconKey] ?? LayoutGrid;
            const isActive = selected === cat.code;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelected(cat.code);
                  void navigate({ to: "/order", search: { category: cat.code } });
                }}
                aria-pressed={isActive}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${
                  isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {loc(cat.name, lang)}
                <span className="text-xs opacity-75">{counts.get(cat.code) ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {t("catalog.resultsCount", { count: visible.length })}
          </p>
          <div
            role="group"
            aria-label={t("catalog.sortLabel")}
            className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-0.5"
          >
            <ArrowDownWideNarrow className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {(
              [
                ["arranged", "catalog.sortArranged"],
                ["popular", "catalog.sortPopular"],
                ["price_asc", "catalog.sortPriceAsc"],
                ["price_desc", "catalog.sortPriceDesc"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={`min-h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold transition ${
                  sort === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {pull.indicator && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center"
          style={{ transform: `translateY(${Math.max(0, pull.offset - 16)}px)` }}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md ${pull.spinning ? "animate-spin" : ""}`}
          >
            <ArrowDownWideNarrow className="h-4 w-4 text-secondary" />
          </span>
        </div>
      )}

      <div className="px-5 pb-28 pt-4">
        {showError ? (
          <ErrorState message={loadError} onRetry={() => void load(true).catch(() => undefined)} />
        ) : loading ? (
          <GridSkeleton count={6} />
        ) : products.length === 0 ? (
          <EmptyState title={t("catalog.emptyTitle")} body={t("catalog.emptyBody")} />
        ) : visible.length === 0 ? (
          <NoResultsState />
        ) : (
          <div className="space-y-6">
            {sections.map((sec) => {
              const SecIcon = sec.cat ? (CATEGORY_ICONS[sec.cat.iconKey] ?? LayoutGrid) : null;
              return (
                <section key={sec.key} aria-label={sec.cat ? loc(sec.cat.name, lang) : undefined}>
                  {sec.cat && SecIcon && (
                    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/15">
                        <SecIcon className="h-4 w-4 text-secondary" aria-hidden />
                      </span>
                      {loc(sec.cat.name, lang)}
                    </h2>
                  )}
          <div className="grid grid-cols-2 gap-3">
                    {sec.items.map((product) => {
                      const p = { ...product, isFavourite: fav.isFav(product) };
                      return (
                        <ProductCard
                          key={p.id}
                          product={p}
                          qty={quantities[p.id] ?? 0}
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
                          onToggleFavourite={() => void fav.toggle(p)}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

