import { useTranslation } from "react-i18next";
import { Heart, Minus, Plus } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { formatINR, loc, priceSave, type CatalogProduct } from "@/lib/catalogue";

/** Price + struck MRP on one line. Shared by cards, the detail screen and the cart. */
export function PriceLine({ product, size = "card" }: { product: CatalogProduct; size?: "card" | "detail" }) {
  const { t } = useTranslation();
  if (product.price === null) {
    return <span className="text-sm font-semibold text-foreground">{t("catalog.priceOnRequest")}</span>;
  }
  return (
    <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className={`font-bold text-primary ${size === "detail" ? "text-2xl" : "text-[17px] leading-none"}`}>
        {formatINR(product.price)}
      </span>
      {product.mrp !== null && product.mrp > product.price && (
        <span className={`truncate text-muted-foreground line-through ${size === "detail" ? "text-sm" : "text-[11px]"}`}>
          {formatINR(product.mrp)}
        </span>
      )}
    </span>
  );
}

/** Save + deposit lines under the price row. */
export function PriceExtras({ product, size = "card" }: { product: CatalogProduct; size?: "card" | "detail" }) {
  const { t } = useTranslation();
  const save = priceSave(product);
  const deposit = product.isReturnable && product.depositAmount != null && product.depositAmount > 0;
  if (save === null && !deposit) return null;
  const small = size === "detail" ? "text-sm" : "text-[11px]";
  return (
    <div className="mt-1 space-y-0.5 leading-tight">
      {save !== null && (
        <p className={`whitespace-nowrap font-semibold text-success ${small}`}>
          {t("catalog.save", { amount: formatINR(save) })}
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
  onToggleFavourite,
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
  onToggleFavourite: () => void;
}) {
  const { t } = useTranslation();
  const blocked = !canOrder;
  const disabled = blocked || offline;
  const name = loc(product.name, lang);
  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-2 shadow-sm">
      <button type="button" onClick={onOpen} aria-label={name} className="block aspect-square w-full overflow-hidden rounded-xl bg-secondary/10">
        <SmartImage
          src={product.imageUrl ?? product.images[0] ?? null}
          alt={name}
          className="h-full w-full object-contain p-2"
        />
      </button>
      <button
        type="button"
        onClick={onToggleFavourite}
        aria-pressed={product.isFavourite}
        aria-label={t(product.isFavourite ? "catalog.removeFavourite" : "catalog.addFavourite")}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
          <Heart
            aria-hidden
            className={`h-3.5 w-3.5 ${product.isFavourite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
          />
        </span>
      </button>
      <button type="button" onClick={onOpen} className="mt-2 px-0.5 text-left">
        <p className="truncate text-sm font-bold leading-snug text-foreground">{name}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{loc(product.packLabel, lang) || "\u00a0"}</p>
      </button>
      <div className="mt-auto px-0.5 pt-2">
        <div className="flex items-center justify-between gap-1">
          <PriceLine product={product} />
          {product.price === null ? null : qty === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={disabled}
              title={blocked ? t("cart.orderingAfterApproval") : offline ? t("offline.hint") : undefined}
              className="flex h-8 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-primary pl-2 pr-3 text-xs font-bold text-primary-foreground shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t("home.addToCart")}
            </button>
          ) : (
            <div className="flex h-8 shrink-0 items-center rounded-full bg-primary text-primary-foreground">
              <button
                type="button"
                onClick={onDec}
                aria-label={t("home.decreaseQty")}
                className="flex h-8 w-7 items-center justify-center rounded-full transition active:scale-90"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-4 text-center text-xs font-bold">{qty}</span>
              <button
                type="button"
                onClick={onInc}
                disabled={product.maxOrderQty != null && qty >= product.maxOrderQty}
                aria-label={t("home.increaseQty")}
                className="flex h-8 w-7 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <PriceExtras product={product} />
      </div>
    </div>
  );
}
