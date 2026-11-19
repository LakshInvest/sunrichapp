import { useEffect, useRef } from "react";
import { isRefreshForeground, onDataRefresh, REFRESH_INTERVAL_MS } from "@/lib/data-refresh";

/** Keep existing data visible; serialize refreshes and pause in the background. */
export function useDataRefresh(refresh: () => unknown, poll: boolean | (() => unknown) = false) {
  const latest = useRef(refresh);
  const polling = useRef(poll);
  latest.current = refresh;
  polling.current = poll;
  const enabled = !!poll;
  useEffect(() => {
    let running = false;
    const run = async (timer = false) => {
      if (running || !isRefreshForeground()) return;
      running = true;
      try { await (timer && typeof polling.current === "function" ? polling.current() : latest.current()); } catch { /* screen retains its last good data */ }
      finally { running = false; }
    };
    const off = onDataRefresh(() => { void run(); });
    const timer = enabled ? setInterval(() => { void run(true); }, REFRESH_INTERVAL_MS) : undefined;
    return () => { off(); if (timer) clearInterval(timer); };
  }, [enabled]);
}