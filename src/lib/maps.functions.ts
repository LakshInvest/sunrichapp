// The Google Maps key is website-restricted to our domains, so ALL Google
// calls happen in the browser (see gmaps.ts): Maps JavaScript for maps and pin
// drag, the Places library for autocomplete, the Maps JS Geocoder for pin →
// address, and Static Maps images loaded by <img>. The server only hands the
// key to signed-in browsers — it makes no Google calls itself.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deep link that opens the Google Maps app/site without a key. */
export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** The website-restricted browser key, handed only to signed-in browsers. */
export const getMapsBrowserKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env["GOOGLE_MAPS_API_KEY"];
    if (!key) throw new Error("Google Maps is not configured (missing key).");
    return { key };
  });
