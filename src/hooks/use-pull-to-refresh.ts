import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh for touch screens. Attach the returned handlers to a
 * scrollable container; while dragging past the threshold it shows a small
 * refresh indicator and calls onRefresh once.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    if ((e.currentTarget as HTMLElement).scrollTop <= 0) {
      startY.current = e.touches[0]?.clientY ?? null;
    }
  }, [refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (delta > 8) pulling.current = true;
    if (pulling.current && delta > 0) setPull(Math.min(70, delta * 0.5));
  }, []);

  const finish = useCallback(async () => {
    const shouldRefresh = pull >= 50;
    startY.current = null;
    pulling.current = false;
    setPull(0);
    if (!shouldRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 350);
    }
  }, [pull, refreshing, onRefresh]);

  return {
    indicator: pull > 0 || refreshing,
    offset: refreshing ? 40 : pull,
    spinning: refreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: () => void finish(),
      onTouchCancel: () => void finish(),
    },
  };
}
