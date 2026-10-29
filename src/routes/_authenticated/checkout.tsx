import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Banknote, CalendarDays, ChevronDown, Loader2, MapPin, Wallet } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SmartImage } from "@/components/SmartImage";
import { fallbackImageFor } from "@/components/catalog/image-fallbacks";
import { LocationPicker } from "@/components/LocationPicker";
import { DEFAULT_LOCATION, type LocationValue } from "@/components/locationShared";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import {
  fetchCatalogue,
  formatINR,
  loc,
  readCatalogueCache,
  type CatalogData,
} from "@/lib/catalogue";
import {
  isoDaysFromToday,
  placeMyOrder,
  quoteMyOrder,
  type PlacedOrder,
  type QuoteResult,
} from "@/lib/orders";
import { getMyRegistration, type RegistrationDto } from "@/lib/registration.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: en.checkout.metaTitle },
      { name: "description", content: en.checkout.metaDescription },
      { property: "og:title", content: en.checkout.metaTitle },
      { property: "og:description", content: en.checkout.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checkout,
});

const SLOTS = ["morning", "afternoon", "evening"] as const;

const MapPreview = lazy(() => import("@/components/MapPreview"));

function Checkout() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const { quantities, clear } = useCart();
  const myReg = useServerFn(getMyRegistration);
  const deva = lang === "en" ? "" : "font-deva";

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [reg, setReg] = useState<RegistrationDto | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addr, setAddr] = useState({ line1: "", line2: "", landmark: "", city: "", pincode: "" });
  const [loc_, setLoc_] = useState<LocationValue | null>(null);
  const [when, setWhen] = useState<"today" | "tomorrow" | "pick">("today");
  const [customDate, setCustomDate] = useState(isoDaysFromToday(2));
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>("morning");
  const [newc, setNewc] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placingRef = useRef(false);

  useEffect(() => {
    let active = true;
    void myReg().then((r) => {
      if (!active) return;
      setReg(r);
      setAddr({
        line1: r.addressLine1 ?? "",
        line2: r.addressLine2 ?? "",
        landmark: r.landmark ?? "",
        city: r.city ?? "",
        pincode: r.pincode ?? "",
      });
      if (r.latitude != null && r.longitude != null) {
        setLoc_({ lat: r.latitude, lng: r.longitude, accuracy: null });
      }
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  useEffect(() => {
    let active = true;
    void fetchCatalogue()
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const products = data?.products ?? [];

  const rows = useMemo(() => {
    return Object.entries(quantities)
      .map(([id, qty]) => {
        const p = products.find((x) => x.id === id);
        if (!p || p.price == null) return null;
        return { product: p, qty };
      })
      .filter((r): r is { product: CatalogData["products"][number]; qty: number } => r !== null);
  }, [products, quantities]);

  const noPriceCount = Object.keys(quantities).filter((id) => {
    const p = products.find((x) => x.id === id);
    return p && p.price == null;
  }).length;

  const linesPayload = useMemo(
    () =>
      rows.map(({ product, qty }) => ({
        product_id: product.id,
        qty,
        new_containers: product.isReturnable && product.depositAmount != null ? newc[product.id] ?? 0 : 0,
      })),
    [rows, newc],
  );

  const refreshQuote = useCallback(async () => {
    if (offline || rows.length === 0) return;
    try {
      const q = await quoteMyOrder(linesPayload);
      setQuote(q);
      setQuoteError(null);
    } catch (e) {
      setQuoteError((e as Error).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, JSON.stringify(linesPayload)]);

  useEffect(() => {
    const id = setTimeout(() => void refreshQuote(), 350);
    return () => clearTimeout(id);
  }, [refreshQuote]);

  const deliveryDate = when === "today" ? isoDaysFromToday(0) : when === "tomorrow" ? isoDaysFromToday(1) : customDate;

  const addressLines = [addr.line1, addr.line2, addr.landmark, addr.city, addr.pincode].filter(Boolean);

  const place = async () => {
    if (placingRef.current || offline || rows.length === 0) return;
    placingRef.current = true;
    setPlacing(true);
    setError(null);
    try {
      const parts = await placeMyOrder(
        linesPayload,
        {
          address_line1: addr.line1 || reg?.addressLine1 || null,
          address_line2: addr.line2 || null,
          landmark: addr.landmark || null,
          city: addr.city || null,
          pincode: addr.pincode || null,
          latitude: loc_?.lat ?? null,
          longitude: loc_?.lng ?? null,
          delivery_date: deliveryDate,
          delivery_slot: t(`checkout.slot.${slot}`),
        },
        notes.trim() || null,
      );
      sessionStorage.setItem("sunrich.lastOrder", JSON.stringify({ parts, deliveryDate, slot: t(`checkout.slot.${slot}`) }));
      clear();
      await navigate({ to: "/order-success" });
    } catch (e) {
      setError((e as Error).message || t("checkout.errPlace"));
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  const onCredit = quote != null && quote.credit_limit > 0;
  const exceedsCredit = quote != null && onCredit && quote.items_total + quote.deposit_total > quote.credit_available;

  const inputCls =
    "min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30";
  const chipCls = (active: boolean) =>
    `min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
    }`;

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-16 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/cart" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("checkout.title")}</p>
      </header>

      <div className="px-5 pt-5">
        {/* Delivery address */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <MapPin className="h-4 w-4 text-secondary" aria-hidden />
              {t("checkout.addressTitle")}
            </p>
            <button
              type="button"
              onClick={() => setEditingAddress((v) => !v)}
              aria-expanded={editingAddress}
              className="min-h-9 text-sm font-semibold text-secondary"
            >
              {editingAddress ? t("account.cancel") : t("account.edit")}
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{addressLines.join(", ") || "—"}</p>
          {loc_?.lat != null && loc_?.lng != null ? (
            <div className="mt-3">
              <Suspense fallback={<div className="h-36 w-full animate-pulse rounded-xl bg-muted" />}>
                <MapPreview lat={loc_.lat} lng={loc_.lng} />
              </Suspense>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{t("checkout.noPin")}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("checkout.addressNote")}</p>

          {editingAddress && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{t("checkout.line1")}</span>
                <input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{t("checkout.line2")}</span>
                <input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{t("checkout.landmark")}</span>
                <input value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} className={inputCls} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">{t("checkout.city")}</span>
                  <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">{t("checkout.pincode")}</span>
                  <input value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} className={inputCls} inputMode="numeric" maxLength={6} />
                </label>
              </div>
              <LocationPicker value={loc_ ?? DEFAULT_LOCATION} onChange={setLoc_} />
            </div>
          )}
        </section>

        {/* Delivery date & slot */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-secondary" aria-hidden />
            {t("checkout.whenTitle")}
          </p>
          <div className="mt-3 flex gap-2" role="group" aria-label={t("checkout.whenTitle")}>
            <button type="button" onClick={() => setWhen("today")} aria-pressed={when === "today"} className={chipCls(when === "today")}>
              {t("checkout.today")}
            </button>
            <button type="button" onClick={() => setWhen("tomorrow")} aria-pressed={when === "tomorrow"} className={chipCls(when === "tomorrow")}>
              {t("checkout.tomorrow")}
            </button>
            <button type="button" onClick={() => setWhen("pick")} aria-pressed={when === "pick"} className={chipCls(when === "pick")}>
              {t("checkout.pickDate")}
            </button>
          </div>
          {when === "pick" && (
            <input
              type="date"
              value={customDate}
              min={isoDaysFromToday(0)}
              max={isoDaysFromToday(6)}
              onChange={(e) => setCustomDate(e.target.value)}
              className={`${inputCls} mt-3`}
              aria-label={t("checkout.pickDate")}
            />
          )}
          <div className="mt-3 flex gap-2" role="group" aria-label={t("checkout.slotLabel")}>
            {SLOTS.map((s) => (
              <button key={s} type="button" onClick={() => setSlot(s)} aria-pressed={slot === s} className={chipCls(slot === s)}>
                {t(`checkout.slot.${s}`)}
              </button>
            ))}
          </div>
        </section>

        {/* New jars needed? */}
        {rows.some((r) => r.product.isReturnable && (r.product.depositAmount ?? 0) > 0) && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-bold text-foreground">{t("checkout.newJarsTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("checkout.newJarsHint")}</p>
            <ul className="mt-3 space-y-3">
              {rows
                .filter((r) => r.product.isReturnable && (r.product.depositAmount ?? 0) > 0)
                .map(({ product, qty }) => {
                  const count = newc[product.id] ?? 0;
                  const dep = product.depositAmount ?? 0;
                  return (
                    <li key={product.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary/10">
                        <SmartImage
                          src={product.imageUrl ?? product.images[0] ?? null}
                          alt={loc(product.name, lang)}
                          fallbackSrc={fallbackImageFor(product)}
                          className="h-12 w-12 object-cover"
                          iconClassName="h-5 w-5 text-secondary/70"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{loc(product.name, lang)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("checkout.jarDepositEach", { amount: formatINR(dep) })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => setNewc((prev) => ({ ...prev, [product.id]: Math.max(0, count - 1) }))}
                          aria-label={t("checkout.fewerNewJars")}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-foreground transition active:scale-90"
                        >
                          −
                        </button>
                        <span className="min-w-5 text-center text-sm font-bold">{count}</span>
                        <button
                          type="button"
                          onClick={() => setNewc((prev) => ({ ...prev, [product.id]: Math.min(qty, count + 1) }))}
                          disabled={count >= qty}
                          aria-label={t("checkout.moreNewJars")}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-foreground transition active:scale-90 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {/* Bill */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-bold text-foreground">{t("checkout.billTitle")}</p>
          {quoteError ? (
            <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {quoteError}
            </p>
          ) : quote ? (
            <>
              <ul className="mt-3 space-y-1.5">
                {quote.lines.map((l) => (
                  <li key={l.product_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {l.product_name} ×{l.qty}
                    </span>
                    <span className="font-medium text-foreground">{formatINR(l.line_total)}</span>
                  </li>
                ))}
              </ul>
              {quote.deposit_total > 0 && (
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("cart.jarDeposit")}</span>
                  <span className="font-medium text-foreground">{formatINR(quote.deposit_total)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("cart.delivery")}</span>
                <span className="font-semibold text-secondary">{t("cart.free")}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("checkout.gstIncluded")}</p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                <span>{t("cart.grandTotal")}</span>
                <span className="text-primary">{formatINR(quote.items_total + quote.deposit_total)}</span>
              </div>
            </>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("checkout.quoting")}
            </div>
          )}
        </section>

        {/* Payment */}
        {quote && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-bold text-foreground">{t("checkout.paymentTitle")}</p>
            {onCredit ? (
              <div className="mt-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                  <Wallet className="h-4 w-4 text-secondary" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("checkout.onCredit", { amount: formatINR(quote.credit_available) })}
                  </p>
                  {exceedsCredit && (
                    <p className="mt-1.5 rounded-lg bg-accent/15 px-2.5 py-1.5 text-xs font-medium text-accent-foreground">
                      {t("checkout.creditReview")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                  <Banknote className="h-4 w-4 text-secondary" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-foreground">{t("checkout.cashOnDelivery")}</p>
              </div>
            )}
          </section>
        )}

        {/* Notes */}
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("checkout.notesLabel")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("checkout.notesPlaceholder")}
            className="rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void place()}
          disabled={placing || offline || rows.length === 0 || quote == null}
          title={offline ? t("offline.hint") : undefined}
          className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:opacity-50"
        >
          {placing && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {placing ? t("checkout.placing") : t("checkout.placeOrder")}
        </button>
        {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        {noPriceCount > 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("checkout.priceOnRequestNote", { count: noPriceCount })}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("checkout.termsNote")}</p>
      </div>
    </main>
  );
}
