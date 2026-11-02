import type { RegistrationDto } from "@/lib/registration.functions";

/**
 * In-memory copy of the auth gate's check (user + registration) so page
 * changes don't wait for the network. A cold app open always re-checks.
 */
type Entry = { userId: string; reg: RegistrationDto; at: number };
let entry: Entry | null = null;

export const GATE_FRESH_MS = 30_000;
export const GATE_MAX_MS = 5 * 60_000;

export function readGate(userId: string, now = Date.now()): { reg: RegistrationDto; stale: boolean } | null {
  if (!entry || entry.userId !== userId || now - entry.at > GATE_MAX_MS) return null;
  return { reg: entry.reg, stale: now - entry.at > GATE_FRESH_MS };
}

export function writeGate(userId: string, reg: RegistrationDto, now = Date.now()) {
  entry = { userId, reg, at: now };
}

export function clearGate() {
  entry = null;
}
