/**
 * Tiny persisted stale-while-revalidate cache for signed-in screens
 * (Khata summary, payment proofs, orders list). Screens show the stored copy
 * at once, then refresh from the network. Cleared on sign-out.
 * Prices are never trusted from here at checkout (the server quote decides).
 */
const PREFIX = "sunrich.swr.";

export function readSwr<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as { v: T }).v : null;
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
export async function swr<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const v = await fn();
  writeSwr(key, v);
  return v;
}

/** Remove every per-user cached copy (sign-out / account switch). */
export function clearUserCaches() {
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
