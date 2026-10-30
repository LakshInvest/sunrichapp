import { useIsDemo } from "@/hooks/use-demo";
import { scrollToFirstError } from "@/lib/form-errors";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Banknote, CalendarDays, ChevronDown, Loader2, MapPin, Wallet } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SmartImage } from "@/components/SmartImage";
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
  fetchMyDefaultDeliveryMode,
  setOrderDeliveryMode,
  type DeliveryMode,
  quoteMyOrder,
  type PlacedOrder,
  type QuoteResult,
} from "@/lib/orders";
import { getMyRegistration, type RegistrationDto } from "@/lib/registration.functions";
import { useServerFn } from "@tanstack/react-start";
import { SheetDrawer } from "@/components/SheetDrawer";
import { AddressEditor } from "@/components/AddressEditor";
import { readSelectedAddressId, setSelectedAddressId } from "@/lib/selected-address";
import { addressText, labelKey, listMyAddresses, setMyOrderAddress, type SavedAddress } from "@/lib/addresses";
import { deliveryDays, minOrderShortfall, slotName, slotsFor, useAppSettings } from "@/lib/app-settings";
import { Check, Plus } from "lucide-react";

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

const PLANT_MAP_URL = "https://www.google.com/maps/search/?api=1&query=Sunrich+MIDC+Latur";
const SLOTS = ["morning", "afternoon", "evening"] as const;

const MapPreview = lazy(() => import("@/components/MapPreview"));

function Checkout() {
  const { t } = useTranslation();
  const isDemo = useIsDemo();
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
  const settings = useAppSettings();
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newAddrOpen, setNewAddrOpen] = useState(false);
  const [mode, setMode] = useState<DeliveryMode>("sunrich");
  const [defaultMode, setDefaultMode] = useState<DeliveryMode>("sunrich");
  const [vehicle, setVehicle] = useState("");
  useEffect(() => {
    void fetchMyDefaultDeliveryMode().then((m) => {
      setDefaultMode(m);
      setMode(m);
    });
  }, []);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [newc, setNewc] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) scrollToFirstError();
  }, [error]);
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

  // Saved addresses (Task 4): default preselected; registered address otherwise.
  const useSaved = settings?.multipleAddresses !== false && saved.length > 0;
  const loadSaved = useCallback(async (pick?: string) => {
    try {
      const list = await listMyAddresses();
      setSaved(list);
      const remembered = readSelectedAddressId();
      setSavedId(
        (cur) =>
          pick ?? cur ?? list.find((a) => a.id === remembered)?.id ?? list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? null,
      );
    } catch {
      /* fall back to the registered address */
    }
  }, []);
  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);
  const savedAddr = useSaved ? saved.find((a) => a.id === savedId) ?? null : null;
  useEffect(() => {
    if (!savedAddr) return;
    setAddr({
      line1: savedAddr.line1,
      line2: savedAddr.line2 ?? "",
      landmark: savedAddr.landmark ?? "",
      city: savedAddr.city ?? "",
      pincode: savedAddr.pincode ?? "",
    });
    setLoc_(savedAddr.lat != null && savedAddr.lng != null ? { lat: savedAddr.lat, lng: savedAddr.lng, accuracy: null } : null);
  }, [savedAddr]);

  // Delivery days & slots from Command Center settings (Task 3).
  const now = useMemo(() => new Date(), []);
  const days = useMemo(
    () =>
      deliveryDays(
        settings ?? { deliveryDaysAhead: 6, sameDayCutoff: "23:59", closedWeekdays: [], holidays: [] },
        now,
      ),
    [settings, now],
  );
  useEffect(() => {
    if (day && days.some((d) => d.iso === day && !d.closed)) return;
    setDay(days.find((d) => !d.closed)?.iso ?? null);
  }, [days, day]);
  const slots = useMemo(() => (settings && day ? slotsFor(settings, day, now) : []), [settings, day, now]);
  useEffect(() => {
    if (slots.length === 0) return;
    if (slot && slots.some((x) => x.code === slot && !x.disabled)) return;
    setSlot(slots.find((x) => !x.disabled)?.code ?? null);
  }, [slots, slot]);
  const slotLabel = (() => {
    const x = slots.find((y) => y.code === slot);
    if (x) return slotName(x, lang);
    return SLOTS.includes(slot as never) ? t(`checkout.slot.${slot}`) : slot ?? "";
  })();
  const fmtDay = (d: Date) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-IN" : `${lang}-IN`, { weekday: "short", day: "numeric", month: "short" }).format(d);

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

  const deliveryDate = day ?? isoDaysFromToday(1);
  const itemsTotal = rows.reduce((a, r) => a + (r.product.price ?? 0) * r.qty, 0);
  const shortfall = minOrderShortfall(quote?.items_total ?? itemsTotal, settings?.minOrderValue ?? 0);
  const notesAllowed = settings?.allowOrderNotes ?? true;
  const pickup = mode === "pickup";
  const noSlot = !pickup && slots.length > 0 && !slots.some((x) => x.code === slot && !x.disabled);

  const addressLines = [addr.line1, addr.line2, addr.landmark, addr.city, addr.pincode].filter(Boolean);

  const place = async () => {
    if (placingRef.current || offline || rows.length === 0 || shortfall > 0 || !day || noSlot) return;
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
          delivery_slot: pickup ? t("delivery.pickupSlot") : slotLabel,
        },
        notesAllowed ? notes.trim() || null : null,
      );
      if (savedAddr && parts.length > 0) {
        try {
          await setMyOrderAddress(parts.map((p) => p.order_id), savedAddr.id);
        } catch (e) {
          console.warn("set_my_order_address failed", e);
        }
      }
      if (pickup !== (defaultMode === "pickup") || (pickup && vehicle.trim())) {
        for (const p of parts) {
          try {
            await setOrderDeliveryMode(p.order_id, mode, pickup ? vehicle : null);
          } catch (e) {
            console.warn("set_order_delivery_mode failed", e);
          }
        }
      }
      sessionStorage.setItem("sunrich.lastOrder", JSON.stringify({ parts, deliveryDate, slot: slotLabel }));
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
      {isDemo && (
        <p role="status" className="bg-accent px-5 py-1.5 text-center text-xs font-semibold text-accent-foreground">
          {t("demo.checkoutBanner")}
        </p>
      )}
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
        {/* Delivery mode */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-bold text-foreground">{t("delivery.title")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={t("delivery.title")}>
            {(["sunrich", "pickup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`${chipCls(mode === m)} min-h-12`}
              >
                {t(`delivery.${m}`)}
              </button>
            ))}
          </div>
          {pickup && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-secondary/10 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{t("delivery.pickupFrom")}</p>
                <a
                  href={PLANT_MAP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-secondary underline"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  {t("delivery.openMap")}
                </a>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{t("delivery.vehicle")}</span>
                <input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="MH24AB1234"
                  className={inputCls}
                />
              </label>
            </div>
          )}
        </section>

        {!pickup && (
          <>
        {/* Delivery address */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <MapPin className="h-4 w-4 text-secondary" aria-hidden />
              {t("checkout.addressTitle")}
            </p>
            {useSaved ? (
              <button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 px-2 text-sm font-semibold text-secondary">
                {t("addresses.change")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditingAddress((v) => !v)}
                aria-expanded={editingAddress}
                className="min-h-11 px-2 text-sm font-semibold text-secondary"
              >
                {editingAddress ? t("account.cancel") : t("account.edit")}
              </button>
            )}
          </div>
          {savedAddr && (
            <span className="mt-2 inline-block rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {t(labelKey(savedAddr.label))}
            </span>
          )}
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

          {editingAddress && !useSaved && (
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

          </>
        )}
        {/* Delivery date & slot */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-secondary" aria-hidden />
            {pickup ? t("delivery.pickupDate") : t("checkout.whenTitle")}
          </p>
          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("checkout.whenTitle")}>
            {days.map((d, i) => (
              <button
                key={d.iso}
                type="button"
                disabled={d.closed}
                onClick={() => setDay(d.iso)}
                aria-pressed={day === d.iso}
                className={`flex min-h-14 min-w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-xl border px-2 text-xs font-semibold transition active:scale-95 disabled:opacity-45 ${
                  day === d.iso ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                <span>{d.isToday ? t("checkout.today") : i <= 1 && days[0]?.isToday ? t("checkout.tomorrow") : fmtDay(d.date).split(",")[0]}</span>
                <span className="font-normal">{d.closed ? t("checkout.closed") : fmtDay(d.date).replace(/^[^,]*,\s*/, "")}</span>
              </button>
            ))}
          </div>
          {pickup ? null : slots.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={t("checkout.slotLabel")}>
              {slots.map((x) => (
                <button
                  key={x.code}
                  type="button"
                  disabled={x.disabled}
                  onClick={() => setSlot(x.code)}
                  aria-pressed={slot === x.code}
                  className={`${chipCls(slot === x.code)} flex flex-col items-center justify-center py-1.5 disabled:opacity-45`}
                >
                  <span>{slotName(x, lang)}</span>
                  <span className="text-[11px] font-normal opacity-80">{x.from}–{x.to}</span>
                </button>
              ))}
            </div>
          ) : (
            !settings && <div className="mt-3 h-11 animate-pulse rounded-xl bg-muted" />
          )}
          {noSlot && <p className="mt-2 text-xs font-medium text-destructive">{t("checkout.noSlotToday")}</p>}
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
                        <SmartImage width={48}
                          src={product.imageUrl ?? product.images[0] ?? null}
                          alt={loc(product.name, lang)}
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
                      {l.product_name} · {t("common.packs", { count: l.qty })}
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
        {notesAllowed && (
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
        )}

        {shortfall > 0 && (
          <p role="status" className="mt-4 rounded-xl bg-accent/15 px-4 py-3 text-center text-sm font-semibold text-foreground">
            {t("cart.addMore", { amount: formatINR(shortfall) })}
          </p>
        )}

        {error && (
          <p data-field-error role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void place()}
          disabled={placing || offline || rows.length === 0 || quote == null || shortfall > 0 || !day || noSlot}
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

      <SheetDrawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <div className="max-h-[80vh] overflow-y-auto px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-foreground">{t("addresses.pickTitle")}</h2>
          <ul className="mt-3 space-y-2">
            {saved.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSavedId(a.id);
                    setPickerOpen(false);
                  }}
                  className={`flex min-h-14 w-full items-start gap-3 rounded-xl border p-3 text-left ${a.id === savedId ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary">
                    {a.id === savedId && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-primary">
                      {t(labelKey(a.label))}
                      {a.isDefault ? ` · ${t("addresses.default")}` : ""}
                    </span>
                    <span className="block text-sm text-foreground">{addressText(a)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setPickerOpen(false);
              setNewAddrOpen(true);
            }}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-secondary/50 text-base font-semibold text-primary"
          >
            <Plus className="h-5 w-5" aria-hidden />
            {t("addresses.addNew")}
          </button>
        </div>
      </SheetDrawer>
      <AddressEditor
        open={newAddrOpen}
        onOpenChange={setNewAddrOpen}
        address={null}
        isFirst={saved.length === 0}
        onSaved={(id) => void loadSaved(id)}
      />
    </main>
  );
}
