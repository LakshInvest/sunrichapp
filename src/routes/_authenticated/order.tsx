import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow, CupSoda, GlassWater, LayoutGrid, Milk, Package, type LucideIcon } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { CartBar } from "@/components/CartBar";
import { ClearCartDialog } from "@/components/ClearCartDialog";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SearchBox } from "@/components/catalog/SearchBox";
import { EmptyState, ErrorState, GridSkeleton, NoResultsState } from "@/components/catalog/states";
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
  saveCartPrice,
  type CatalogData,
} from "@/lib/catalogue";
import { serverMessage as friendlyError } from "@/lib/form-errors";

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

/** Shop: search bar + category chips ("All" first) + product grid. Nothing else. */
function Order() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { category } = Route.useSearch();
  const navigate = useNavigate();
  const { quantities, setQty, count, clear } = useCart();
  const offline = useOffline();
  const fav = useFavourites();

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState<string[]>(() => loadRecentSearches());
  const [selected, setSelected] = useState<string>(category ?? "all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, setPending] = useState(false);

  const reg = useServerFn(getMyRegistration);
  useEffect(() => {
    let active = true;
    void reg().then((r: RegistrationDto) => {
      if (active) setPending(r.status === "pending_approval");
    });
    return () => {
      active = false;
    };
  }, [reg]);

  useEffect(() => {
    if (category) setSelected(category);
  }, [category]);

  const load = useCallback(async (force = false) => {
    try {
      const fresh = await fetchCatalogue({ force });
      setData(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError(friendlyError(e, t("errors.generic")));
      throw e;
    }
  }, [t]);

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

  const total = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product?.price != null ? sum + product.price * qty : sum;
      }, 0),
    [quantities, products],
  );

  const visible = useMemo(
    () =>
      products
        .filter((p) => selected === "all" || p.categoryCode === selected)
        .filter((p) => matchesSearch(p, search)),
    [products, selected, search],
  );

  const showError = !loading && !data;

  return (
    <PageShell
      className={`${deva}`}
      touchHandlers={pull.handlers}
    >

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 pb-3 pt-[max(1.75rem,env(safe-area-inset-top))] backdrop-blur-md">
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
                onClick={() => setSelected(cat.code)}
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

      <div className="px-5 pb-32 pt-4">
        {showError ? (
          <ErrorState message={loadError} onRetry={() => void load(true).catch(() => undefined)} />
        ) : loading ? (
          <GridSkeleton count={6} />
        ) : products.length === 0 ? (
          <EmptyState title={t("catalog.emptyTitle")} body={t("catalog.emptyBody")} />
        ) : visible.length === 0 ? (
          <NoResultsState />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((product) => {
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

      <BottomNav />
    </PageShell>
  );
}
