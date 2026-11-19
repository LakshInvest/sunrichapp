import { useEffect, useRef } from "react";
import { isRefreshForeground, onDataRefresh, REFRESH_INTERVAL_MS } from "@/lib/data-refresh";

/** Keep existing data visible; serialize refreshes and pause in the background. */
export function useDataRefresh(refresh: () => unknown, poll = false) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    let running = false;
    const run = async () => {
      if (running || !isRefreshForeground()) return;
      running = true;
      try { await latest.current(); } catch { /* screen retains its last good data */ }
      finally { running = false; }
    };
    const off = onDataRefresh(() => { void run(); });
    const timer = poll ? setInterval(() => { void run(); }, REFRESH_INTERVAL_MS) : undefined;
    return () => { off(); if (timer) clearInterval(timer); };
  }, [poll]);
}