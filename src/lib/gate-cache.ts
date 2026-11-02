import type { RegistrationDto } from "@/lib/registration.functions";

/**
 * Copy of the auth gate's check (user + registration). Page changes reuse it
 * from memory; a cold open (2nd app open) starts from the copy saved in
 * localStorage (up to 24 h old) and re-checks in the background.
 */
type Entry = { userId: string; reg: RegistrationDto; at: number };
let entry: Entry | null = null;

export const GATE_FRESH_MS = 30_000;
export const GATE_MAX_MS = 5 * 60_000;
export const GATE_COLD_MAX_MS = 24 * 60 * 60_000;
const KEY = "sunrich_gate";

function load(): Entry | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const e = raw ? (JSON.parse(raw) as Entry) : null;
    return e && typeof e.userId === "string" && e.reg && typeof e.at === "number" ? e : null;
  } catch {
    return null;
  }
}

/** Last check for this user. `cold` = taken from storage (not this app run); always re-check those. */
export function readGate(userId: string, now = Date.now()): { reg: RegistrationDto; stale: boolean; cold: boolean } | null {
  if (entry && entry.userId === userId && now - entry.at <= GATE_MAX_MS) {
    return { reg: entry.reg, stale: now - entry.at > GATE_FRESH_MS, cold: false };
  }
  const saved = load();
  if (saved && saved.userId === userId && now - saved.at <= GATE_COLD_MAX_MS) {
    entry = saved;
    return { reg: saved.reg, stale: true, cold: true };
  }
  return null;
}

export function writeGate(userId: string, reg: RegistrationDto, now = Date.now()) {
  entry = { userId, reg, at: now };
  try {
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* storage full / unavailable: memory copy still works */
  }
}

export function clearGate() {
  entry = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
