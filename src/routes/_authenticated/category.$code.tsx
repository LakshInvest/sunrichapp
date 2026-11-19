import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import en from "@/locales/en.json";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CartBar } from "@/components/CartBar";
import { ClearCartDialog } from "@/components/ClearCartDialog";
import { GridSkeleton } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useFavourites } from "@/hooks/use-favourites";
import { useRateLocked } from "@/lib/rate-lock";
import { openPriceRequestChat } from "@/lib/price-request";
import { fetchCatalogue, formatINR, loc, readCatalogueCache, saveCartPrice, type CatalogData } from "@/lib/catalogue";

export const Route = createFileRoute("/_authenticated/category/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code} products — Sunrich` },
      { name: "description", content: en.home.metaDescription },
      { property: "og:title", content: `${params.code} products — Sunrich` },
      { property: "og:description", content: en.home.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { quantities, setQty, clear, count } = useCart();
  const offline = useOffline();
  const fav = useFavourites();
  const locked = useRateLocked();
  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void fetchCatalogue().then(setData).catch(() => undefined);
  }, []);

  const refresh = () => fetchCatalogue({ force: true }).then(setData);
  useDataRefresh(refresh);
  const products = data?.products ?? [];
  const cat = data?.categories.find((c) => c.code === code);
  const list = useMemo(() => products.filter((p) => p.categoryCode === code), [products, code]);
  const total = Object.entries(quantities).reduce((sum, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return p?.price != null ? sum + p.price * qty : sum;
  }, 0);
  const deva = lang === "en" ? "" : "font-deva";

  return (
    <PageShell onRefresh={refresh} className={`pb-44 ${deva}`}>
      <header className="relative z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button type="button" onClick={() => navigate({ to: "/home" })} aria-label={t("registration.back")} className="flex h-11 w-11 items-center justify-center rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-bold text-foreground">{cat ? loc(cat.name, lang) : ""}</h1>
      </header>
      <div className="mt-3 px-3">
        {!data ? (
          <GridSkeleton count={4} />
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("home.categoryEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {list.map((product) => {
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
                  onPriceRequest={() => void openPriceRequestChat(p, lang, navigate)}
                  onInc={() => setQty(p.id, Math.min((quantities[p.id] ?? 0) + 1, p.maxOrderQty ?? Infinity))}
                  onDec={() => setQty(p.id, (quantities[p.id] ?? 0) - 1)}
                  onSetQty={(n) => setQty(p.id, p.maxOrderQty != null ? Math.min(n, p.maxOrderQty) : n)}
                />
              );
            })}
          </div>
        )}
      </div>
      <CartBar count={count} total={formatINR(total)} pending={locked} onOpen={() => void navigate({ to: "/cart" })} onClear={() => setConfirmClear(true)} />
      <ClearCartDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
      />
    </PageShell>
  );
}
