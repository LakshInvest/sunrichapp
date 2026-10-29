import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { toggleFavourite, type CatalogProduct } from "@/lib/catalogue";

/**
 * Favourite hearts with an optimistic update: the heart flips immediately
 * and rolls back with a toast when the RPC fails.
 */
export function useFavourites() {
  const { t } = useTranslation();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isFav = useCallback(
    (p: Pick<CatalogProduct, "id" | "isFavourite">) => overrides[p.id] ?? p.isFavourite,
    [overrides],
  );

  const toggle = useCallback(
    async (product: Pick<CatalogProduct, "id" | "isFavourite">) => {
      const current = overrides[product.id] ?? product.isFavourite;
      setOverrides((o) => ({ ...o, [product.id]: !current }));
      try {
        const next = await toggleFavourite(product.id);
        setOverrides((o) => ({ ...o, [product.id]: next }));
      } catch {
        setOverrides((o) => {
          const rolled = { ...o };
          delete rolled[product.id];
          return rolled;
        });
        toast.error(t("catalog.favError"));
      }
    },
    [overrides, t],
  );

  return { isFav, toggle };
}
