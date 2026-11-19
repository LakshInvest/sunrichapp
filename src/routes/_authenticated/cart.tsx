import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Check, Factory, Loader2, MapPin, Plus, Trash2, Truck } from "lucide-react";
import en from "@/locales/en.json";
import { SmartImage } from "@/components/SmartImage";
import { QtyStepper } from "@/components/catalog/ProductCard";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLang } from "@/hooks/use-lang";
import { useCart } from "@/hooks/use-cart";
import { useOffline } from "@/hooks/use-offline";
import { useAppSettings } from "@/lib/app-settings";
import { serverMessage } from "@/lib/form-errors";
import { clampQty, fetchCatalogue, getHomeExtras, loc, pickupInfo, readCatalogueCache, type CatalogData } from "@/lib/catalogue";
import { formatPack, fixName } from "@/lib/pack-label";
import { addressText, labelKey, listMyAddresses, type SavedAddress } from "@/lib/addresses";
import { fetchMyDefaultDeliveryMode } from "@/lib/orders";
import { addDaysIso, isAllowedDate, quoteDateBounds, requestQuote, type QuoteMode } from "@/lib/quote-flow";
import { indDate } from "@/lib/order-format";
import { requestDataRefresh } from "@/lib/data-refresh";

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
  component: QuoteFlow,
});

type Step = "cart" | "mode" | "address" | "date" | "note" | "review";
const ORDER: Step[] = ["cart", "mode", "address", "date", "note", "review"];

function QuoteFlow() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const settings = useAppSettings();
  const { quantities, setQty, clear } = useCart();
  const deva = lang === "en" ? "" : "font-deva";

  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  const [step, setStep] = useState<Step>("cart");
  const [mode, setMode] = useState<QuoteMode | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const bounds = useMemo(() => quoteDateBounds(), []);
  const [date, setDate] = useState(bounds.def);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; no: string } | null>(null);

  useEffect(() => { void fetchCatalogue().then(setData).catch(() => undefined); }, []);
  useEffect(() => { void fetchMyDefaultDeliveryMode().then((m) => setMode((old) => old ?? m)).catch(() => setMode((old) => old ?? "sunrich")); }, []);
  useEffect(() => {
    void listMyAddresses().then((list) => {
      setAddresses(list);
      setAddressId((old) => old ?? (list.find((a) => a.isDefault) ?? list[0])?.id ?? null);
    }).catch(() => setAddresses([]));
  }, []);

  const products = data?.products ?? [];
  const rows = useMemo(() => Object.entries(quantities)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
    .filter((r): r is { product: NonNullable<typeof r.product>; qty: number } => !!r.product)
    .sort((a, b) => a.product.sortOrder - b.product.sortOrder), [products, quantities]);
  const packs = rows.reduce((s, r) => s + r.qty, 0);

  useEffect(() => {
    if (!done && data && Object.keys(quantities).length === 0) void navigate({ to: "/home", replace: true });
  }, [data, quantities, done, navigate]);

  const steps = ORDER.filter((s) => !(s === "address" && mode === "pickup"));
  const idx = steps.indexOf(step);
  const go = (d: 1 | -1) => {
    setError(null);
    const next = steps[idx + d];
    if (next) setStep(next); else if (d === -1) window.history.length > 1 ? window.history.back() : void navigate({ to: "/home" });
    window.scrollTo({ top: 0 });
  };
  const address = addresses?.find((a) => a.id === addressId) ?? null;
  const extras = getHomeExtras();
  const pick = pickupInfo(extras, lang);
  const plant = pick.address ?? settings?.plantAddress ?? t("checkout2.plantDefault");
  const pickHours = pick.hours ?? settings?.pickupHours ?? null;
  const shopAddr = extras?.defaultAddress ? [extras.defaultAddress["line1"], extras.defaultAddress["city"]].filter((x) => typeof x === "string" && x).join(", ") : "";

  const canNext =
    step === "cart" ? rows.length > 0 :
    step === "mode" ? mode !== null :
    step === "address" ? !!addressId || addresses?.length === 0 :
    step === "date" ? isAllowedDate(date) : true;

  const send = async () => {
    if (sending || offline || !mode) return;
    setSending(true); setError(null);
    try {
      const delivery: { delivery_mode: QuoteMode; delivery_date: string; address_id?: string } = { delivery_mode: mode, delivery_date: date };
      if (mode === "sunrich" && addressId) delivery.address_id = addressId;
      const r = await requestQuote(rows.map((x) => ({ product_id: x.product.id, qty: x.qty })), delivery, note.trim() || null);
      clear();
      requestDataRefresh();
      setDone({ id: r.order_id, no: r.order_no });
    } catch (e) {
      setError(serverMessage(e, t("quote.sendError")));
    } finally { setSending(false); }
  };

  if (done) {
    return (
      <main className={`mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-background px-6 text-center ${deva}`}>
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 animate-in zoom-in duration-500"><Check className="h-10 w-10 text-success" strokeWidth={3} /></span>
        <h1 className="mt-5 text-2xl font-bold text-primary">{t("quote.sentTitle")}</h1>
        <p className="mt-1 text-sm font-semibold text-foreground">{done.no}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("quote.sentBody")}</p>
        <button type="button" onClick={() => void navigate({ to: "/track/$id", params: { id: done.id }, replace: true })} className="mt-8 min-h-12 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground">{t("quote.viewOrder")}</button>
        <button type="button" onClick={() => void navigate({ to: "/home", replace: true })} className="mt-2 min-h-11 text-sm font-semibold text-muted-foreground">{t("nav.home")}</button>
      </main>
    );
  }

  const title = t(`quote.step.${step}`);
  return (
    <main className={`mx-auto min-h-dvh max-w-md bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] ${deva}`}>
      <header className="sticky top-0 z-30 bg-background/95 px-3 pb-3 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(-1)} aria-label={t("registration.back")} className="flex h-11 w-11 items-center justify-center rounded-xl active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-primary">{title}</h1>
        </div>
        <ol className="mt-2 flex gap-1.5 px-2" aria-label={t("quote.progress", { step: idx + 1, total: steps.length })}>
          {steps.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-secondary" : "bg-muted"}`} />)}
        </ol>
      </header>

      <div className="px-5 pt-2">
        {step === "cart" && (
          <ul className="space-y-2">
            {rows.map(({ product, qty }) => {
              const name = fixName(loc(product.name, lang));
              return (
                <li key={product.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
                  <SmartImage width={64} src={product.imageUrl ?? product.images[0] ?? null} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-card object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatPack(loc(product.packLabel, lang), product.unitsPerSellUnit, product.volumeMl, product.sellUnit)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <QtyStepper compact className="h-9 w-[110px]" qty={qty} max={product.maxOrderQty} onDec={() => setQty(product.id, qty - 1 < product.minOrderQty ? 0 : qty - 1)} onInc={() => setQty(product.id, clampQty(product, qty + 1))} onSet={(n) => setQty(product.id, n === 0 ? 0 : clampQty(product, n))} />
                      <button type="button" onClick={() => setQty(product.id, 0)} aria-label={t("cart.remove")} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground active:scale-95"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </li>
              );
            })}
            <li className="pt-1 text-center text-xs text-muted-foreground">{t("quote.barSummary", { count: rows.length, packs })}</li>
          </ul>
        )}

        {step === "mode" && (
          <div className="grid gap-3">
            {(["sunrich", "pickup"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`flex min-h-24 items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left shadow-sm transition active:scale-[0.99] ${mode === m ? "border-secondary" : "border-transparent"}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-primary">{m === "sunrich" ? <Truck className="h-6 w-6" /> : <Factory className="h-6 w-6" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-foreground">{t(m === "sunrich" ? "quote.modeDelivery" : "quote.modePickup")}</span>
                  {m === "pickup" && <span className="mt-0.5 block text-xs text-muted-foreground">{plant}{pickHours ? ` · ${pickHours}` : ""}</span>}
                </span>
                {mode === m && <Check className="h-5 w-5 text-secondary" />}
              </button>
            ))}
          </div>
        )}

        {step === "address" && (
          <div className="space-y-2">
            {addresses?.length === 0 && (
              <div className="flex w-full items-start gap-3 rounded-2xl border-2 border-secondary bg-card p-4 text-left shadow-sm">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{t("quote.shopAddress")}</span>{shopAddr && <span className="block text-xs text-muted-foreground">{shopAddr}</span>}</span>
                <Check className="h-5 w-5 text-secondary" />
              </div>
            )}
            {addresses === null ? <div className="h-20 animate-pulse rounded-2xl bg-muted" /> : addresses.map((a) => (
              <button key={a.id} type="button" aria-pressed={addressId === a.id} onClick={() => setAddressId(a.id)} className={`flex w-full items-start gap-3 rounded-2xl border-2 bg-card p-4 text-left shadow-sm ${addressId === a.id ? "border-secondary" : "border-transparent"}`}>
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{t(labelKey(a.label))}</span><span className="block text-xs text-muted-foreground">{addressText(a)}</span></span>
                {addressId === a.id && <Check className="h-5 w-5 text-secondary" />}
              </button>
            ))}
            <button type="button" onClick={() => void navigate({ to: "/addresses" })} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-secondary text-sm font-bold text-primary"><Plus className="h-4 w-4" />{t("quote.newAddress")}</button>
          </div>
        )}

        {step === "date" && (
          <div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((d) => {
                const iso = addDaysIso(bounds.min, d);
                return <button key={d} type="button" aria-pressed={date === iso} onClick={() => setDate(iso)} className={`min-h-16 rounded-2xl border-2 bg-card p-3 text-center shadow-sm ${date === iso ? "border-secondary" : "border-transparent"}`}><span className="block text-base font-bold text-foreground">{t(d === 1 ? "quote.tomorrow" : "quote.dayAfter")}</span><span className="text-xs text-muted-foreground">{indDate(iso, lang)}</span></button>;
              })}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-sm"><CalendarDays className="h-5 w-5 text-secondary" /><span className="flex-1 text-sm font-semibold text-foreground">{indDate(date, lang)}</span><span className="text-xs font-bold text-primary">{t("quote.pickDate")}</span></button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar mode="single" selected={new Date(`${date}T00:00:00`)} onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))} disabled={(d) => !isAllowedDate(format(d, "yyyy-MM-dd"))} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {step === "note" && (
          <div>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={5} placeholder={t("quote.notePlaceholder")} className="w-full rounded-2xl border border-input bg-card p-4 text-base text-foreground outline-none focus:border-secondary" />
            <button type="button" onClick={() => { setNote(""); go(1); }} className="mt-2 min-h-11 w-full text-sm font-semibold text-muted-foreground">{t("quote.skip")}</button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-3">
            <section className="rounded-2xl bg-card p-4 shadow-sm">
              <ul className="space-y-1.5">{rows.map(({ product, qty }) => <li key={product.id} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate text-foreground">{fixName(loc(product.name, lang))}</span><span className="shrink-0 font-semibold text-foreground">×{qty}</span></li>)}</ul>
              <button type="button" onClick={() => setStep("cart")} className="mt-2 text-xs font-bold text-primary">{t("quote.edit")}</button>
            </section>
            <ReviewRow icon={mode === "pickup" ? <Factory className="h-5 w-5" /> : <Truck className="h-5 w-5" />} label={t(mode === "pickup" ? "quote.modePickup" : "quote.modeDelivery")} value={mode === "pickup" ? plant : address ? addressText(address) : shopAddr || t("quote.shopAddress")} onEdit={() => setStep(mode === "pickup" ? "mode" : "address")} editLabel={t("quote.edit")} />
            <ReviewRow icon={<CalendarDays className="h-5 w-5" />} label={t("quote.step.date")} value={indDate(date, lang)} onEdit={() => setStep("date")} editLabel={t("quote.edit")} />
            {note.trim() && <ReviewRow icon={<span className="text-base">✎</span>} label={t("quote.step.note")} value={note.trim()} onEdit={() => setStep("note")} editLabel={t("quote.edit")} />}
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{error}</p>}
      </div>

      <div data-kb-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-md">
          {offline && <p className="mb-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
          {step === "review" ? (
            <button type="button" disabled={sending || offline} onClick={() => void send()} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60">{sending && <Loader2 className="h-4 w-4 animate-spin" />}{t("quote.askRate")}</button>
          ) : (
            <button type="button" disabled={!canNext} onClick={() => go(1)} className="min-h-[52px] w-full rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50">{t("quote.goAhead")}</button>
          )}
        </div>
      </div>
    </main>
  );
}

function ReviewRow({ icon, label, value, onEdit, editLabel }: { icon: ReactNode; label: string; value: string; onEdit: () => void; editLabel: string }) {
  return (
    <section className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
      <span className="mt-0.5 text-secondary">{icon}</span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="break-words text-sm font-semibold text-foreground">{value}</p></div>
      <button type="button" onClick={onEdit} className="text-xs font-bold text-primary">{editLabel}</button>
    </section>
  );
}
