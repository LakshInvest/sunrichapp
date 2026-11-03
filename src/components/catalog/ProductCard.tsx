import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Lock, Minus, Plus } from "lucide-react";
import { useRateLocked } from "@/lib/rate-lock";
import { useRouter } from "@tanstack/react-router";
import { SmartImage } from "@/components/SmartImage";
import { isBusinessType, useTypeCode } from "@/lib/customer-type";
import { formatPack, fixName } from "@/lib/pack-label";
import { formatINR, loc, priceSave, type CatalogProduct } from "@/lib/catalogue";

/** Price + struck MRP on one line. Shared by cards, the detail screen and the cart. */
export function PriceLine({ product, size = "card" }: { product: CatalogProduct; size?: "card" | "detail" }) {
  const { t } = useTranslation();
  const locked = useRateLocked();
  if (locked) {
    return (
      <span className="flex min-w-0 flex-col leading-tight">
        {product.mrp !== null && (
          <span className={`text-muted-foreground ${size === "detail" ? "text-sm" : "text-[11px]"}`}>
            {t("catalog.mrp", { amount: formatINR(product.mrp) })}
          </span>
        )}
        <span className={`flex items-center gap-1 font-semibold text-foreground ${size === "detail" ? "text-base" : "text-xs"}`}>
          <Lock className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          {t("catalog.rateAfterApproval")}
        </span>
      </span>
    );
  }
  if (product.price === null) {
    return <span className="text-sm font-semibold text-foreground">{t("catalog.priceOnRequest")}</span>;
  }
  return (
    <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className={`font-bold text-primary ${size === "detail" ? "text-2xl" : "text-[17px] leading-none"}`}>
        {formatINR(product.price)}
      </span>
      {size === "detail" && product.mrp !== null && product.mrp > product.price && (
        <span className="truncate text-sm text-muted-foreground line-through">{formatINR(product.mrp)}</span>
      )}
    </span>
  );
}

/** Save + deposit lines under the price row. */
export function PriceExtras({ product, size = "card" }: { product: CatalogProduct; size?: "card" | "detail" }) {
  const { t } = useTranslation();
  const locked = useRateLocked();
  const save = priceSave(product);
  const saveKey = isBusinessType(useTypeCode()) ? "product2.margin" : "catalog.save";
  const deposit = product.isReturnable && product.depositAmount != null && product.depositAmount > 0;
  if (locked || (save === null && !deposit)) return null;
  const small = size === "detail" ? "text-sm" : "text-[11px]";
  return (
    <div className="mt-1 space-y-0.5 leading-tight">
      {save !== null && (
        <p className={`whitespace-nowrap font-semibold text-success ${small}`}>
          {t(saveKey, { amount: formatINR(save) })}
        </p>
      )}
      {deposit && (
        <p className={`whitespace-nowrap text-muted-foreground ${small}`}>
          {t("catalog.depositLine", { amount: formatINR(product.depositAmount) })}
        </p>
      )}
    </div>
  );
}

export function PriceBlock({
  product,
  className,
  size = "card",
}: {
  product: CatalogProduct;
  className?: string;
  size?: "card" | "detail";
}) {
  return (
    <div className={className}>
      <PriceLine product={product} size={size} />
      <PriceExtras product={product} size={size} />
    </div>
  );
}

/** "− 5 +" stepper; tapping the number lets the customer type a quantity (0 removes). */
export function QtyStepper({
  qty,
  onInc,
  onDec,
  onSet,
  max,
  className = "h-10",
}: {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  onSet: (n: number) => void;
  max?: number | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 0) onSet(n);
  };
  return (
    <div className={`flex w-full items-center justify-between rounded-full bg-primary text-primary-foreground ${className}`}>
      <button type="button" onClick={onDec} aria-label={t("home.decreaseQty")} className="flex h-full w-11 items-center justify-center rounded-full active:scale-90">
        <Minus className="h-4 w-4" />
      </button>
      {editing ? (
        <input
          autoFocus
          inputMode="numeric"
          enterKeyHint="done"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onFocus={(e) => {
            document.documentElement.dataset["typing"] = "1";
            const el = e.currentTarget;
            el.select();
            setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
          }}
          onBlur={() => {
            delete document.documentElement.dataset["typing"];
            commit();
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-label={t("home.typeQty")}
          className="h-full w-12 min-w-0 bg-transparent text-center text-sm font-bold text-primary-foreground caret-transparent outline-none selection:bg-transparent"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(qty));
            setEditing(true);
          }}
          aria-label={t("home.typeQty")}
          className="h-full min-w-12 select-none bg-transparent text-center text-sm font-bold outline-none [-webkit-tap-highlight-color:transparent] focus:outline-none"
        >
          {qty}
        </button>
      )}
      <button
        type="button"
        onClick={onInc}
        disabled={max != null && qty >= max}
        aria-label={t("home.increaseQty")}
        className="flex h-full w-11 items-center justify-center rounded-full active:scale-90 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ProductCard({
  product,
  qty,
  lang,
  canOrder,
  offline,
  onOpen,
  onAdd,
  onInc,
  onDec,
  onSetQty,
  onPriceRequest,
  onPrefetch,
}: {
  product: CatalogProduct;
  qty: number;
  lang: string;
  canOrder: boolean;
  offline: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onSetQty?: (n: number) => void;
  onToggleFavourite?: () => void;
  onPriceRequest?: () => void;
  onPrefetch?: () => void;
}) {
  const { t } = useTranslation();
  const locked = useRateLocked();
  const router = useRouter();
  const prefetch = onPrefetch ?? (() => void router.preloadRoute({ to: "/product/$id", params: { id: product.id } }).catch(() => undefined));
  const blocked = !canOrder;
  const disabled = blocked || offline;
  const name = fixName(loc(product.name, lang));
  const pack = formatPack(loc(product.packLabel, lang), product.unitsPerSellUnit, product.volumeMl);
  const save = locked ? null : priceSave(product);
  const saveKey = isBusinessType(useTypeCode()) ? "product2.margin" : "catalog.save";
  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-2.5 shadow-[0_1px_8px_-2px_color-mix(in_oklab,var(--primary)_14%,transparent)]">
      <button type="button" onClick={onOpen} onPointerDown={prefetch} aria-label={name} className="block aspect-square w-full overflow-hidden rounded-xl bg-card">
        <SmartImage width={180} src={product.imageUrl ?? product.images[0] ?? null} alt={name} className="h-full w-full bg-card object-contain p-1 mix-blend-multiply" />
      </button>
      <button type="button" onClick={onOpen} className="mt-2 text-left">
        <p className="truncate text-sm font-bold leading-snug text-foreground">{name}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{pack || "\u00a0"}</p>
      </button>
      <div className="mt-1.5 flex min-h-9 flex-col justify-end">
        <PriceLine product={product} />
        <p className="h-4 text-[11px] font-semibold leading-4 text-success">{save !== null ? t(saveKey, { amount: formatINR(save) }) : ""}</p>
      </div>
      <div className="mt-auto pt-2">
        {locked ? (
          <div className="h-10" />
        ) : product.price === null ? (
          onPriceRequest ? (
            <button type="button" onClick={onPriceRequest} className="flex h-10 w-full items-center justify-center rounded-full bg-secondary/15 text-xs font-bold text-primary active:scale-95">
              {t("catalog.priceOnRequest")}
            </button>
          ) : <div className="h-10" />
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            title={blocked ? t("cart.orderingAfterApproval") : offline ? t("offline.hint") : undefined}
            className="ml-auto flex h-10 items-center justify-center gap-1 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("home.addToCart")}
          </button>
        ) : (
          <QtyStepper qty={qty} onInc={onInc} onDec={onDec} onSet={(n) => (onSetQty ? onSetQty(n) : n === 0 && onDec())} max={product.maxOrderQty} />
        )}
      </div>
    </div>
  );
}
