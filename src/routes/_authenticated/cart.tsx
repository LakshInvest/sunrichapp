import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CircleAlert, Droplets, Minus, Plus } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { SmartImage } from "@/components/SmartImage";
import { ClearCartDialog } from "@/components/ClearCartDialog";
import { ErrorState, GridSkeleton } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { minOrderShortfall, useAppSettings } from "@/lib/app-settings";
import { getMyRegistration } from "@/lib/registration.functions";
import { serverMessage } from "@/lib/form-errors";
import {
  clampQty,
  fetchCatalogue,
  formatINR,
  forgetCartPrice,
  loadCartPrices,
  loc,
  readCatalogueCache,
  saveCartPrice,
  type CatalogData,
} from "@/lib/catalogue";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: en.cart.metaTitle },
      { name: "description", content: en.cart.metaDescription },
      { property: "og:title", content: en.cart.metaTitle },
      { property: "og:description", content: en.cart.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { quantities, setQty, clear } = useCart();
  const offline = useOffline();
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, setPending] = useState(false);
  const myReg = useServerFn(getMyRegistration);
  const deva = lang === "en" ? "" : "font-deva";

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!readCatalogueCache());

  useEffect(() => {
    let active = true;
    void myReg().then((reg) => {
      if (active) setPending(reg.status === "pending_approval");
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  const load = useCallback(async (force = false) => {
    try {
      const fresh = await fetchCatalogue({ force });
      setData(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError(serverMessage(e, t("errors.generic")));
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

  // Empty cart (clear cart / last item removed) → automatically go back to Home.
  const redirected = useRef(false);
  useEffect(() => {
    if (loading || !data) return;
    if (Object.keys(quantities).length > 0) {
      redirected.current = false;
      return;
    }
    if (!redirected.current) {
      redirected.current = true;
      void navigate({ to: "/home", replace: true });
    }
  }, [data, loading, quantities, navigate]);

  const products = data?.products ?? [];

  // Remove products that left the catalogue, with a notice.
  useEffect(() => {
    if (!data) return;
    const gone = Object.keys(quantities).filter((id) => !products.some((p) => p.id === id));
    if (gone.length > 0) {
      for (const id of gone) {
        forgetCartPrice(id);
        setQty(id, 0);
      }
      toast(t("cart.removedFromCatalogue"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Keep every quantity within the product's min/max rules.
  useEffect(() => {
    if (!data) return;
    for (const [id, qty] of Object.entries(quantities)) {
      const p = products.find((x) => x.id === id);
      if (p) {
        const clamped = clampQty(p, qty);
        if (clamped !== qty) setQty(id, clamped);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, quantities]);

  const rows = useMemo(() => {
    const saved = loadCartPrices();
    return Object.entries(quantities)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        if (!product) return null;
        const changed = saved[id] !== undefined && product.price !== null && saved[id] !== product.price;
        if (product.price != null && saved[id] !== product.price) saveCartPrice(id, product.price);
        return { product, qty, changed };
      })
      .filter((r): r is { product: (typeof products)[number]; qty: number; changed: boolean } => r !== null)
      .sort((a, b) => a.product.sortOrder - b.product.sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, quantities]);

  const itemTotal = rows.reduce((sum, r) => sum + (r.product.price ?? 0) * r.qty, 0);
  const hasUnpriced = rows.some((r) => r.product.price === null);
  const settings = useAppSettings();
  const minValue = settings?.minOrderValue ?? 0;
  const shortfall = minOrderShortfall(itemTotal, minValue);
  const jarDeposit = rows.reduce(
    (sum, r) =>
      r.product.price !== null && r.product.isReturnable && r.product.depositAmount != null
        ? sum + r.product.depositAmount * r.qty
        : sum,
    0,
  );
  const grandTotal = itemTotal + jarDeposit;
  const hasBulk = rows.some(
    (r) => r.product.bulkThresholdQty != null && r.qty >= (r.product.bulkThresholdQty ?? Infinity),
  );

  return (
    <PageShell className={`${deva}`}>
      <div className="px-5 pb-44 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">{t("cart.title")}</h1>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-9 text-sm font-semibold text-destructive"
            >
              {t("cart.clearCart")}
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-6">
            <GridSkeleton count={2} />
          </div>
        ) : !data ? (
          <ErrorState message={loadError} onRetry={() => void load().catch(() => undefined)} />
        ) : rows.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/15">
              <Droplets className="h-10 w-10 text-secondary" aria-hidden />
            </div>
            <p className="mt-5 text-lg font-bold text-foreground">{t("cart.emptyTitle")}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("cart.emptySubtitle")}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/home" })}
              className="mt-6 min-h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98]"
            >
              {t("cart.browse")}
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-5 space-y-3">
              {rows.map(({ product, qty, changed }) => (
                <li
                  key={product.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary/10">
                    <SmartImage width={64}
                      src={product.imageUrl ?? product.images[0] ?? null}
                      alt={loc(product.name, lang)}
                      className="h-16 w-16 object-cover"
                      iconClassName="h-6 w-6 text-secondary/70"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{loc(product.name, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {[loc(product.packLabel, lang), t("common.packs", { count: qty })].filter(Boolean).join(" · ")}
                    </p>
                    {changed && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-accent-foreground">
                        <CircleAlert className="h-3 w-3" aria-hidden />
                        {t("cart.priceUpdated")}
                      </p>
                    )}
                    <p className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className={product.price === null ? "text-sm font-semibold text-destructive" : "text-base font-bold text-primary"}>
                        {product.price === null ? t("cart.priceNotAvailable") : formatINR(product.price * qty)}
                      </span>
                      {product.price !== null && product.mrp !== null && product.mrp > product.price && (
                        <span className="text-xs text-muted-foreground line-through">{formatINR(product.mrp * qty)}</span>
                      )}
                    </p>
                    {product.isReturnable && product.depositAmount != null && product.depositAmount > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {t("cart.depositLine", { amount: formatINR(product.depositAmount * qty) })}
                      </p>
                    )}
                    {product.bulkThresholdQty != null && qty >= product.bulkThresholdQty && (
                      <p className="mt-1 rounded-lg bg-accent/15 px-2 py-1 text-[11px] font-medium text-accent-foreground">
                        {t("cart.bulkNote")}
                      </p>
                    )}
                  </div>
                  {product.price === null ? (
                    <button
                      type="button"
                      onClick={() => {
                        forgetCartPrice(product.id);
                        setQty(product.id, 0);
                      }}
                      disabled={offline}
                      title={offline ? t("offline.hint") : undefined}
                      className="flex min-h-9 shrink-0 items-center rounded-full border border-destructive/40 px-4 text-xs font-bold text-destructive transition active:scale-95 disabled:opacity-50"
                    >
                      {t("cart.remove")}
                    </button>
                  ) : (
                    <div className="flex items-center rounded-full bg-primary text-primary-foreground">
                      <button
                        type="button"
                        onClick={() => setQty(product.id, qty - 1)}
                        disabled={offline}
                        aria-label={t("home.decreaseQty")}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full transition after:absolute after:-inset-y-1.5 after:-inset-x-1 after:content-[''] active:scale-90 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, qty + 1)}
                        disabled={offline || (product.maxOrderQty != null && qty >= product.maxOrderQty)}
                        aria-label={t("home.increaseQty")}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full transition after:absolute after:-inset-y-1.5 after:-inset-x-1 after:content-[''] active:scale-90 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {offline && <p className="mt-3 text-center text-xs text-muted-foreground">{t("offline.cartHint")}</p>}

            <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("cart.itemTotal")}</span>
                <span className="font-medium text-foreground">{formatINR(itemTotal)}</span>
              </div>
              {jarDeposit > 0 && (
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("cart.jarDeposit")}</span>
                  <span className="font-medium text-foreground">{formatINR(jarDeposit)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("cart.delivery")}</span>
                <span className="font-semibold text-secondary">{t("cart.free")}</span>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-base font-bold text-foreground">
                  <span>{t("cart.grandTotal")}</span>
                  <span className="text-primary">{formatINR(grandTotal)}</span>
                </div>
              </div>
              {hasBulk && (
                <p className="mt-3 rounded-xl bg-accent/15 px-3 py-2 text-xs font-medium text-accent-foreground">
                  {t("cart.bulkNote")}
                </p>
              )}
            </section>

            {shortfall > 0 && (
              <div role="status" className="mt-5 rounded-xl bg-accent/15 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{t("cart.addMore", { amount: formatINR(shortfall) })}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-card">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (itemTotal / minValue) * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t("cart.minOrder", { amount: formatINR(minValue) })}</p>
              </div>
            )}

            {hasUnpriced && (
              <div role="status" className="mt-5 rounded-xl bg-destructive/10 px-4 py-3">
                <p className="text-sm font-medium text-destructive">{t("errors.noPrice")}</p>
              </div>
            )}

            {pending ? (
              <button
                type="button"
                disabled
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-xl bg-muted text-lg font-semibold text-muted-foreground"
              >
                {t("cart.orderingAfterApproval")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate({ to: "/checkout" })}
                disabled={offline || shortfall > 0 || hasUnpriced}
                title={hasUnpriced ? t("errors.noPrice") : offline ? t("offline.hint") : undefined}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cart.proceed")}
              </button>
            )}
          </>
        )}
      </div>

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
