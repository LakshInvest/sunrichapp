import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Droplets, Minus, Plus } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { SmartImage } from "@/components/SmartImage";
import { ClearCartDialog } from "@/components/ClearCartDialog";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { getMyRegistration } from "@/lib/registration.functions";
import { homeContent, pick } from "@/data/homeContent";

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
  const [confirmClear, setConfirmClear] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [pending, setPending] = useState(false);
  const myReg = useServerFn(getMyRegistration);
  const deva = lang === "en" ? "" : "font-deva";

  useEffect(() => {
    let active = true;
    void myReg().then((reg) => {
      if (active) setPending(reg.status === "pending_approval");
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .map(([id, qty]) => ({ product: homeContent.products.find((p) => p.id === id), qty }))
        .filter((entry): entry is { product: (typeof homeContent.products)[number]; qty: number } =>
          Boolean(entry.product),
        )
        .sort((a, b) => a.product.sortOrder - b.product.sortOrder),
    [quantities],
  );

  const itemTotal = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const placeOrder = () => {
    setOrdered(true);
  };

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background ${deva}`}>
      <div className="px-5 pb-44 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">{t("cart.title")}</h1>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-9 text-sm font-semibold text-destructive"
            >
              {t("cart.clearCart")}
            </button>
          )}
        </div>

        {items.length === 0 ? (
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
              {items.map(({ product, qty }) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary/10">
                    <SmartImage
                      src={product.imageUrl}
                      alt={pick(product.name, lang)}
                      className="h-16 w-16 object-cover"
                      iconClassName="h-6 w-6 text-secondary/70"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {pick(product.name, lang)}
                    </p>
                    <p className="text-xs text-muted-foreground">{pick(product.packLabel, lang)}</p>
                    <p className="mt-0.5 text-sm font-bold text-primary">
                      ₹{product.price * qty}
                    </p>
                  </div>
                  <div className="flex items-center rounded-full bg-primary text-primary-foreground">
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty - 1)}
                      aria-label={t("home.decreaseQty")}
                      className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty + 1)}
                      aria-label={t("home.increaseQty")}
                      className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("cart.itemTotal")}</span>
                <span className="font-medium text-foreground">₹{itemTotal}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("cart.delivery")}</span>
                <span className="font-semibold text-secondary">{t("cart.free")}</span>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-base font-bold text-foreground">
                  <span>{t("cart.grandTotal")}</span>
                  <span className="text-primary">₹{itemTotal}</span>
                </div>
              </div>
            </section>

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
                onClick={placeOrder}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98]"
              >
                {t("cart.placeOrder")}
              </button>
            )}
            {ordered && (
              <p className="mt-3 animate-in fade-in text-center text-sm font-medium text-secondary duration-300">
                {t("cart.comingSoon")}
              </p>
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
    </main>
  );
}
