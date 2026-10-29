import { useTranslation } from "react-i18next";
import { Heart, Minus, Plus } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { formatINR, loc, priceSave, type CatalogProduct } from "@/lib/catalogue";

/** Price rules shared by cards, the detail screen and the cart. */
export function PriceBlock({
  product,
  className,
  size = "card",
}: {
  product: CatalogProduct;
  className?: string;
  size?: "card" | "detail";
}) {
  const { t } = useTranslation();
  const save = priceSave(product);
  return (
    <div className={className}>
      {product.price === null ? (
        <span className="text-sm font-semibold text-foreground">{t("catalog.priceOnRequest")}</span>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className={`font-bold text-primary ${size === "detail" ? "text-2xl" : "text-base"}`}>
            {formatINR(product.price)}
          </span>
          {product.mrp !== null && product.mrp > product.price && (
            <>
              <span className="text-xs text-muted-foreground line-through">{formatINR(product.mrp)}</span>
              {save !== null && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {t("catalog.save", { amount: formatINR(save) })}
                </span>
              )}
            </>
          )}
        </div>
      )}
      {product.isReturnable && product.depositAmount != null && product.depositAmount > 0 && (
        <p className="text-[11px] leading-tight text-muted-foreground">
          {t("catalog.depositLine", { amount: formatINR(product.depositAmount) })}
        </p>
      )}
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
  return (
    <div className="relative flex flex-col rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        aria-label={loc(product.name, lang)}
        className="overflow-hidden rounded-xl bg-secondary/10"
      >
        <SmartImage
          src={product.imageUrl ?? product.images[0] ?? null}
          alt={loc(product.name, lang)}
          className="aspect-square w-full object-cover"
        />
      </button>
      <button
        type="button"
        onClick={onToggleFavourite}
        aria-pressed={product.isFavourite}
        aria-label={t(product.isFavourite ? "catalog.removeFavourite" : "catalog.addFavourite")}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur-sm transition active:scale-90"
      >
        <Heart
          aria-hidden
          className={`h-4 w-4 ${product.isFavourite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
        />
      </button>
      <button type="button" onClick={onOpen} className="mt-2 text-left">
        <p className="line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground">
          {loc(product.name, lang)}
        </p>
        <p className="text-xs leading-tight text-muted-foreground">{loc(product.packLabel, lang)}</p>
      </button>
      <div className="mt-2 flex items-end justify-between gap-1">
        <PriceBlock product={product} className="min-w-0" />
        {product.price === null ? null : qty === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            title={blocked ? t("cart.orderingAfterApproval") : offline ? t("offline.hint") : undefined}
            className="min-h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("home.addToCart")}
          </button>
        ) : (
          <div className="flex shrink-0 items-center rounded-full bg-primary text-primary-foreground">
            <button
              type="button"
              onClick={onDec}
              aria-label={t("home.decreaseQty")}
              className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              onClick={onInc}
              disabled={product.maxOrderQty != null && qty >= product.maxOrderQty}
              aria-label={t("home.increaseQty")}
              className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
