/**
 * Tiny persisted stale-while-revalidate cache for signed-in screens
 * (Khata summary, payment proofs, orders list). Screens show the stored copy
 * at once, then refresh from the network. Cleared on sign-out.
 * Prices are never trusted from here at checkout (the server quote decides).
 */
const PREFIX = "sunrich.swr.";
export const SCREEN_FRESH_MS = 60_000;
export const SCREEN_CACHE_MS = 10 * 60_000;
let generation = 0;
const inflight = new Map<string, Promise<unknown>>();

function readEntry<T>(key: string): { v: T; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const entry = raw ? JSON.parse(raw) as { v: T; at: number } : null;
    return entry && Date.now() - entry.at <= SCREEN_CACHE_MS ? entry : null;
  } catch { return null; }
}

export function readSwr<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    return readEntry<T>(key)?.v ?? null;
  } catch {
    return null;
  }
}

export function writeSwr<T>(key: string, v: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v, at: Date.now() }));
  } catch {
    /* storage full: skip */
  }
}

/** Fetch, store, return. */
export async function swr<T>(key: string, fn: () => Promise<T>, force = false): Promise<T> {
  const cached = readEntry<T>(key);
  if (!force && cached && Date.now() - cached.at < SCREEN_FRESH_MS) return cached.v;
  const current = inflight.get(key);
  if (current) return current as Promise<T>;
  const version = generation;
  const pending = Promise.resolve().then(fn).then((v) => {
    if (version === generation) writeSwr(key, v);
    return v;
  }).finally(() => { if (inflight.get(key) === pending) inflight.delete(key); });
  inflight.set(key, pending);
  return pending;
}

/** Remove every per-user cached copy (sign-out / account switch). */
export function clearUserCaches() {
  generation++;
  inflight.clear();
  try {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(PREFIX) || k === "sunrich.catalogue.v1")) drop.push(k);
    }
    drop.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
