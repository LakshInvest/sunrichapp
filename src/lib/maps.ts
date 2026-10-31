/** Browser-safe pure helpers for Google Maps. Script/key loading and all
 * Google calls live in gmaps.ts (browser-side, website-restricted key). */

export type PlaceDetails = { lat: number; lng: number; address: string };

/** Deep link that opens the Google Maps app/site without a key. */
export { googleMapsLink } from "@/lib/maps.functions";

/** True when two coordinates are effectively the same spot. */
export function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

/** Clamps/bounds static-map query parameters to sane, cheap values. */
export function clampStaticParams(p: { lat: number; lng: number; zoom?: number | undefined }): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const lat = Math.min(85, Math.max(-85, Math.round(p.lat * 1e6) / 1e6));
  const lng = Math.min(180, Math.max(-180, Math.round(p.lng * 1e6) / 1e6));
  const zoom = Math.min(18, Math.max(10, Math.round(p.zoom ?? 16)));
  return { lat, lng, zoom };
}

/** Query string for a browser-loaded Static Maps image (key appended by the caller). */
export function staticMapParams(lat: number, lng: number, zoom = 16, lang = "en"): URLSearchParams {
  const { lat: la, lng: ln, zoom: z } = clampStaticParams({ lat, lng, zoom });
  return new URLSearchParams({
    center: `${la},${ln}`,
    zoom: String(z),
    size: "640x360",
    scale: "2",
    maptype: "roadmap",
    markers: `color:0x0AAAED|${la},${ln}`,
    language: lang,
    region: "in",
  });
}
