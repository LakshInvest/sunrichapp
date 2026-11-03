import { useIsDemo } from "@/hooks/use-demo";
import { serverMessage } from "@/lib/form-errors";
import { scrollToFirstError } from "@/lib/form-errors";
import { advanceAtCheckout, fetchMyAdvance } from "@/lib/khata";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarDays, ChevronDown, Loader2, MapPin, Wallet } from "lucide-react";
import { Banknote, FileCheck2, Landmark as LandmarkIcon, Smartphone as PhoneIcon } from "lucide-react";
import { creditChoice, defaultPayMethod, setOrderPaymentMethod, type PayMethod } from "@/lib/payments";
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

const PAY_ICONS = { credit: Wallet, upi: PhoneIcon, bank: LandmarkIcon, cash: Banknote, cheque: FileCheck2 } as const;

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
  const [modeTotals, setModeTotals] = useState<Partial<Record<DeliveryMode, number>>>({});
  // Khata advance: shown as "Advance used" and spent on the bill when it is issued.
  const [advance, setAdvance] = useState(0);
  useEffect(() => {
    fetchMyAdvance().then(setAdvance, () => setAdvance(0));
  }, []);
  const [pay, setPay] = useState<PayMethod>("upi");
  const [step, setStep] = useState<"mode" | "confirm">("mode");
  const [dateOpen, setDateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const payTouched = useRef(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) scrollToFirstError();
  }, [error]);
  const placingRef = useRef(false);
  const savedAppliedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void myReg().then((r) => {
      if (!active) return;
      setReg(r);
      // A saved address chosen earlier wins over the registered one (they load in parallel).
      if (savedAppliedRef.current) return;
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
    savedAppliedRef.current = true;
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
      const [q, other] = await Promise.all([
        quoteMyOrder(linesPayload, mode),
        quoteMyOrder(linesPayload, mode === "pickup" ? "sunrich" : "pickup").catch(() => null),
      ]);
      setQuote(q);
      setModeTotals({ [mode]: Number(q.items_total) + Number(q.deposit_total ?? 0), ...(other ? { [mode === "pickup" ? "sunrich" : "pickup"]: Number(other.items_total) + Number(other.deposit_total ?? 0) } : {}) });
      setQuoteError(null);
    } catch (e) {
      setQuoteError(serverMessage(e, t("checkout.errPlace")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, mode, JSON.stringify(linesPayload)]);

  useEffect(() => {
    const id = setTimeout(() => void refreshQuote(), 350);
    return () => clearTimeout(id);
  }, [refreshQuote]);

  const deliveryDate = day ?? isoDaysFromToday(1);
  const itemsTotal = rows.reduce((a, r) => a + ((mode === "pickup" ? r.product.pickupPrice : r.product.deliveredPrice) ?? 0) * r.qty, 0);
  const shortfall = minOrderShortfall(quote?.items_total ?? itemsTotal, settings?.minOrderValue ?? 0);
  const notesAllowed = settings?.allowOrderNotes ?? true;
  const pickup = mode === "pickup";
  const noSlot = !pickup && slots.length > 0 && !slots.some((x) => x.code === slot && !x.disabled);

  const addressLines = [addr.line1, addr.line2, addr.landmark, addr.city, addr.pincode].filter(Boolean);

  const place = async () => {
    if (placingRef.current || offline || rows.length === 0 || shortfall > 0 || !day || (pay === "credit" && !credit.allowed)) return;
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
          delivery_slot: pickup ? t("delivery.pickupSlot") : "",
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
      try {
        await setOrderPaymentMethod(parts.map((p) => p.order_id), pay);
      } catch (e) {
        console.warn("set_order_payment_method failed", e);
      }
      sessionStorage.setItem("sunrich.lastOrder", JSON.stringify({ parts, deliveryDate, slot: "", payMethod: pay, pickup }));
      clear();
      await navigate({ to: "/order-success" });
    } catch (e) {
      setError(serverMessage(e, t("checkout.errPlace")));
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  const bill = quote ? quote.items_total + quote.deposit_total : itemsTotal;
  const credit = creditChoice(quote, bill);
  useEffect(() => {
    if (!payTouched.current) setPay(defaultPayMethod());
    else if (pay === "credit" && !credit.allowed) setPay("upi");
  }, [credit.allowed, pay]);

  const inputCls =
    "min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30";
  const chipCls = (active: boolean) =>
    `min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
    }`;

  const payable = quote ? advanceAtCheckout(bill, advance).payable : itemsTotal;
  const dayObj = days.find((d) => d.iso === day);
  const dayText = (d: (typeof days)[number]) =>
    `${d.isToday ? t("checkout.today") : d.iso === days.find((x) => !x.isToday)?.iso && days[0]?.isToday ? t("checkout.tomorrow") : fmtDay(d.date).split(",")[0]}, ${fmtDay(d.date).replace(/^[^,]*,\s*/, "")}`;
  const itemCount = rows.reduce((a, r) => a + r.qty, 0);
  const oneLineAddr = addressLines.join(", ");
  const Row = ({ icon, text, sub, onChange, right }: { icon: string; text: string; sub?: string; onChange?: () => void; right?: string | undefined }) => (
    <div className="flex min-h-14 items-center gap-3 border-b border-border/60 py-3 last:border-0">
      <span aria-hidden className="text-lg">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{text}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      {right && <span className="text-sm font-bold text-foreground">{right}</span>}
      {onChange && (
        <button type="button" onClick={onChange} className="min-h-11 px-2 text-sm font-semibold text-secondary">
          {t("addresses.change")}
        </button>
      )}
    </div>
  );

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-32 ${deva}`}>
      <OfflineBanner />
      {isDemo && (
        <p role="status" className="bg-accent px-5 py-1.5 text-center text-xs font-semibold text-accent-foreground">
          {t("demo.checkoutBanner")}
        </p>
      )}
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-background/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => (step === "confirm" ? setStep("mode") : navigate({ to: "/cart" }))}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">
          {step === "mode" ? t("checkout2.howTitle") : t("checkout2.confirmTitle")}
        </p>
      </header>

      {step === "mode" ? (
        <div className="space-y-3 px-5 pt-4">
          {(["sunrich", "pickup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setStep("confirm");
              }}
              aria-pressed={mode === m}
              className={`flex min-h-24 w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${
                mode === m ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <span aria-hidden className="text-3xl">{m === "sunrich" ? "🚚" : "🏭"}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-foreground">
                  {t(m === "sunrich" ? "checkout2.sunrich" : "checkout2.pickup")}
                  {modeTotals[m] != null && <> · {formatINR(modeTotals[m]!)}</>}
                </span>
                {m === "pickup" && modeTotals.pickup != null && modeTotals.sunrich != null && modeTotals.sunrich > modeTotals.pickup && (
                  <span className="mt-0.5 block text-sm font-semibold text-success">{t("checkout2.pickupSave", { amount: formatINR(modeTotals.sunrich - modeTotals.pickup) })}</span>
                )}
                <span className="mt-1 block text-sm text-muted-foreground">
                  {m === "sunrich" ? oneLineAddr || "—" : settings?.plantAddress ?? t("checkout2.plantDefault")}
                </span>
                {m === "pickup" && settings?.pickupHours && <span className="block text-xs text-muted-foreground">{settings.pickupHours}</span>}
                {m === "pickup" && (
                  <a href={PLANT_MAP_URL} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-secondary">
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> {t("delivery.openMap")}
                  </a>
                )}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-5 pt-2">
          <div className="rounded-2xl bg-card px-4 shadow-sm">
            {pickup ? (
              <Row icon="🏭" text={t("checkout2.pickup")} sub={settings?.plantAddress ?? t("checkout2.plantDefault")} onChange={() => setStep("mode")} />
            ) : (
              <Row
                icon="🚚"
                text={t("checkout2.sunrich")}
                sub={oneLineAddr || "—"}
                onChange={() => (useSaved ? setPickerOpen(true) : setNewAddrOpen(true))}
              />
            )}
            <Row icon="📅" text={dayObj ? dayText(dayObj) : "—"} onChange={() => setDateOpen(true)} />
            <Row icon="💳" text={t(`checkout.payMethod.${pay}`)} onChange={() => setPayOpen(true)} />
            <Row icon="🧾" text={t("checkout2.items", { count: itemCount })} right={quote ? formatINR(payable) : undefined} />
          </div>

          {quote && advanceAtCheckout(bill, advance).used > 0 && (
            <p className="mt-2 text-right text-xs font-semibold text-success" data-testid="advance-used">
              {t("khata.checkout.advanceUsed")} −{formatINR(advanceAtCheckout(bill, advance).used)}
            </p>
          )}

          {pickup && (
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">{t("delivery.vehicle")}</span>
              <input value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase().slice(0, 15))} placeholder="MH24AB1234" className={inputCls} />
            </label>
          )}

          {rows.some((r) => r.product.isReturnable && (r.product.depositAmount ?? 0) > 0) && (
            <section className="mt-4">
              <p className="text-sm font-bold text-foreground">{t("checkout.newJarsTitle")}</p>
              <ul className="mt-2 space-y-2">
                {rows
                  .filter((r) => r.product.isReturnable && (r.product.depositAmount ?? 0) > 0)
                  .map(({ product, qty }) => {
                    const count = newc[product.id] ?? 0;
                    return (
                      <li key={product.id} className="flex items-center gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{loc(product.name, lang)}</span>
                          <span className="text-xs text-muted-foreground">{t("checkout.jarDepositEach", { amount: formatINR(product.depositAmount ?? 0) })}</span>
                        </span>
                        <span className="flex items-center gap-1 rounded-full border border-border px-1">
                          <button type="button" aria-label={t("checkout.fewerNewJars")} onClick={() => setNewc((p) => ({ ...p, [product.id]: Math.max(0, count - 1) }))} className="h-10 w-10 text-lg font-bold">−</button>
                          <span className="min-w-5 text-center text-sm font-bold">{count}</span>
                          <button type="button" aria-label={t("checkout.moreNewJars")} disabled={count >= qty} onClick={() => setNewc((p) => ({ ...p, [product.id]: Math.min(qty, count + 1) }))} className="h-10 w-10 text-lg font-bold disabled:opacity-40">+</button>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          {notesAllowed &&
            (noteOpen || notes ? (
              <textarea
                autoFocus={noteOpen && !notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t("checkout.notesPlaceholder")}
                className="mt-4 w-full rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none focus:border-secondary"
              />
            ) : (
              <button type="button" onClick={() => setNoteOpen(true)} className="mt-3 min-h-11 text-sm font-semibold text-secondary">
                + {t("checkout2.addNote")}
              </button>
            ))}

          {quoteError && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{quoteError}</p>
          )}
          {shortfall > 0 && (
            <p role="status" className="mt-4 rounded-xl bg-accent/15 px-4 py-3 text-center text-sm font-semibold text-foreground">
              {t("cart.addMore", { amount: formatINR(shortfall) })}
            </p>
          )}
          {noPriceCount > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">{t("checkout.priceOnRequestNote", { count: noPriceCount })}</p>}
          {error && (
            <p data-field-error role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div data-kb-bar className="fixed inset-x-0 bottom-0 z-30 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <button
            type="button"
            onClick={() => void place()}
            disabled={placing || offline || rows.length === 0 || quote == null || shortfall > 0 || !day}
            title={offline ? t("offline.hint") : undefined}
            className="mx-auto flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:opacity-50"
          >
            {placing && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {placing ? t("checkout.placing") : quote ? t("checkout2.place", { amount: formatINR(payable) }) : t("checkout.quoting")}
          </button>
          {offline && <p className="mt-1 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        </div>
      )}

      <SheetDrawer open={dateOpen} onOpenChange={setDateOpen}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-foreground">{pickup ? t("delivery.pickupDate") : t("checkout.whenTitle")}</h2>
          <ul className="mt-3 space-y-2">
            {days.map((d) => (
              <li key={d.iso}>
                <button
                  type="button"
                  disabled={d.closed}
                  onClick={() => {
                    setDay(d.iso);
                    setDateOpen(false);
                  }}
                  className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-semibold disabled:opacity-45 ${day === d.iso ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  {dayText(d)}
                  {d.closed ? <span className="text-xs font-normal">{t("checkout.closed")}</span> : day === d.iso ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetDrawer>

      <SheetDrawer open={payOpen} onOpenChange={setPayOpen}>
        <div className="px-5 pb-8 pt-2">
          <h2 className="text-lg font-bold text-foreground">{t("checkout.paymentTitle")}</h2>
          <div role="radiogroup" aria-label={t("checkout.paymentTitle")} className="mt-3 space-y-2">
            {(["upi", "bank", "cash", "cheque", "credit"] as const)
              .filter((m) => m !== "credit" || credit.shown)
              .map((m) => {
                const Icon = PAY_ICONS[m];
                const on = pay === m;
                const blocked = m === "credit" && !credit.allowed;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={blocked}
                    onClick={() => {
                      payTouched.current = true;
                      setPay(m);
                      setPayOpen(false);
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left disabled:opacity-60 ${on ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{t(`checkout.payMethod.${m}`)}</span>
                      {blocked && (
                        <span className="block text-xs text-destructive">{t("checkout2.creditLow", { amount: formatINR(credit.available) })}</span>
                      )}
                    </span>
                    {on && <Check className="h-4 w-4 text-primary" aria-hidden />}
                  </button>
                );
              })}
          </div>
        </div>
      </SheetDrawer>

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
                    setSelectedAddressId(a.id);
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
