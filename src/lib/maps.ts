/** Browser-safe Google Maps helpers; server calls live in maps.functions.ts. */
import { randomUUID } from "@/lib/uuid";

export type { PlaceSuggestion } from "@/lib/maps.functions";

export type { PlaceDetails } from "@/lib/maps.functions";

/** One token per autocomplete interaction (typing → selecting a place). */
export function newSessionToken(): string {
  return randomUUID();
}

export { googleMapsLink } from "@/lib/maps.functions";

/** True when two coordinates are effectively the same spot. */
export function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}
