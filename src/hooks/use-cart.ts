import { useCallback, useEffect, useMemo, useState } from "react";

const CART_KEY = "sunrich.cart";

function readCart(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([id, qty]) => typeof id === "string" && typeof qty === "number" && qty > 0,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Cart quantities persisted in localStorage (survives a reload) and shared
 * between the Home screen, the floating cart bar and the Cart screen.
 */
export function useCart() {
  const [quantities, setQuantities] = useState<Record<string, number>>(readCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(quantities));
  }, [quantities]);

  const setQty = useCallback((id: string, qty: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);

  const clear = useCallback(() => setQuantities({}), []);

  const count = useMemo(
    () => Object.values(quantities).reduce((sum, n) => sum + n, 0),
    [quantities],
  );

  return { quantities, setQty, clear, count };
}
