import type { RegistrationDto } from "@/lib/registration.functions";

/**
 * In-memory copy of the auth gate's check (user + registration) so page
 * changes don't wait for the network. A cold app open always re-checks.
 */
type Entry = { userId: string; reg: RegistrationDto; at: number };
let entry: Entry | null = null;

export const GATE_FRESH_MS = 30_000;
export const GATE_MAX_MS = 5 * 60_000;
/** A cold app open may start from the saved check up to this old (then re-checks in the background). */
export const GATE_COLD_MAX_MS = 24 * 60 * 60_000;
const KEY = "sunrich.gate";

function loadSaved(): Entry | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as Entry) : null;
  } catch {
    return null;
  }
}

export function readGate(userId: string, now = Date.now()): { reg: RegistrationDto; stale: boolean } | null {
  if (entry && entry.userId === userId && now - entry.at <= GATE_MAX_MS) {
    return { reg: entry.reg, stale: now - entry.at > GATE_FRESH_MS };
  }
  // Cold open: start from the saved check, always re-checked in the background.
  if (!entry) {
    const saved = loadSaved();
    if (saved && saved.userId === userId && now - saved.at <= GATE_COLD_MAX_MS) {
      entry = saved;
      return { reg: saved.reg, stale: true };
    }
  }
  return null;
}

export function writeGate(userId: string, reg: RegistrationDto, now = Date.now()) {
  entry = { userId, reg, at: now };
  try {
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* best effort */
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
