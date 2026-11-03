/**
 * Browser-side Google Maps. The key is website-restricted to our domains, so
 * every Google call runs right here in the browser: Maps JavaScript for maps
 * and pin drag, the Places library (new autocomplete) for address search, the
 * Maps JS Geocoder for pin → address, and Static Maps <img> for previews.
 * The server never calls Google; it only hands the key to signed-in browsers
 * (getMapsBrowserKey in maps.functions.ts).
 */
import i18n from "@/lib/i18n";
import { getMapsBrowserKey } from "@/lib/maps.functions";
import { staticMapParams, type PlaceDetails } from "@/lib/maps";

declare global {
  interface Window {
    __sunrichMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

/** Sunrich operates around Latur, Maharashtra — bias search there. The Places
 * JS library caps circle radius at 50,000 m, so clamp to that. */
export const SEARCH_BIAS = { lat: 18.402252, lng: 76.584212, radius: 50_000 };

let keyPromise: Promise<string> | null = null;
/** The website-restricted browser key, cached for the session. */
export function mapsBrowserKey(): Promise<string> {
  keyPromise ??= getMapsBrowserKey().then((r) => r.key);
  return keyPromise;
}

/**
 * Last Google Maps error code (e.g. RefererNotAllowedMapError, ApiNotActivatedMapError,
 * BillingNotEnabledMapError, InvalidKeyMapError). Google only reports it on the console,
 * so we listen there; fallbacks show it in small text so a phone tells us the real cause.
 */
let lastMapsError: string | null = null;
export const getMapsError = () => lastMapsError;
function watchMapsErrors() {
  if (typeof window === "undefined" || (window as unknown as { __gmErrWatch?: boolean }).__gmErrWatch) return;
  (window as unknown as { __gmErrWatch?: boolean }).__gmErrWatch = true;
  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const text = args.map(String).join(" ");
    const m = /Google Maps JavaScript API (?:error|warning): (\w+)/.exec(text);
    if (m?.[1]) lastMapsError = m[1];
    orig(...args);
  };
}

let loader: Promise<typeof google.maps> | null = null;
/** Loads the Maps JavaScript API (Places included) once; resolves on ready. */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps are browser-only"));
  watchMapsErrors();
  loader ??= (async () => {
    if (window.google?.maps?.places) return window.google.maps;
    const key = await mapsBrowserKey();
    const src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&libraries=places&loading=async&callback=__sunrichMapsReady&channel=sunrich_app` +
      `&language=${encodeURIComponent(i18n.language)}&region=IN`;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Google Maps timed out")), 25_000);
      window.__sunrichMapsReady = () => {
        window.clearTimeout(timer);
        resolve();
      };
      if (document.querySelector("script[data-sunrich-gmaps]")) return; // already loading; callback fires
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.dataset["sunrichGmaps"] = "1";
      s.onerror = () => {
        window.clearTimeout(timer);
        lastMapsError ??= "ScriptLoadFailed";
        reject(new Error("Google Maps failed to load"));
      };
      document.head.appendChild(s);
    });
    if (!window.google?.maps?.places) throw new Error("Google Maps failed to load");
    return window.google.maps;
  })();
  loader.catch(() => {
    loader = null; // allow a retry after a failure
  });
  return loader;
}

/** One token per autocomplete interaction (typing → selecting a place). */
export async function newSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
  const maps = await loadGoogleMaps();
  return new maps.places.AutocompleteSessionToken();
}

/** Address search via the new Places autocomplete, biased to our area. */
export async function autocompletePlaces(
  input: string,
  token: google.maps.places.AutocompleteSessionToken,
): Promise<google.maps.places.PlacePrediction[]> {
  const maps = await loadGoogleMaps();
  const res = await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken: token,
    locationBias: {
      center: { lat: SEARCH_BIAS.lat, lng: SEARCH_BIAS.lng },
      radius: SEARCH_BIAS.radius,
    } as google.maps.CircleLiteral,
    language: i18n.language,
    region: "in",
  });
  return res.suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is google.maps.places.PlacePrediction => p != null);
}

function spanText(v: google.maps.places.FormattableText | null | undefined): string {
  return v ? String(v) : "";
}

/** placeId → coordinates + formatted address (Places library). */
export async function placeDetails(
  pred: google.maps.places.PlacePrediction,
): Promise<PlaceDetails | null> {
  const maps = await loadGoogleMaps();
  // toPlace() carries the autocomplete session token into the first fetchFields.
  const place = pred.toPlace();
  await place.fetchFields({ fields: ["location", "formattedAddress"] });
  const loc = place.location;
  if (!loc) return null;
  return {
    lat: loc.lat(),
    lng: loc.lng(),
    address: place.formattedAddress ?? `${spanText(pred.mainText)}, ${spanText(pred.secondaryText)}`,
  };
}

/** Pin → address with the Maps JS Geocoder (""). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const maps = await loadGoogleMaps();
  try {
    const res = await new maps.Geocoder().geocode({ location: { lat, lng }, region: "in" });
    return res.results?.[0]?.formatted_address ?? "";
  } catch {
    return "";
  }
}

/** Pin → area, city, pincode (and the full line) for the map-first address form. */
export async function reverseGeocodeParts(
  lat: number,
  lng: number,
): Promise<{ full: string; area: string; city: string; pincode: string; state: string }> {
  const empty = { full: "", area: "", city: "", pincode: "", state: "" };
  try {
    const maps = await loadGoogleMaps();
    const res = await new maps.Geocoder().geocode({ location: { lat, lng }, region: "in" });
    const r = res.results?.[0];
    if (!r) return empty;
    const get = (type: string) => r.address_components.find((c) => c.types.includes(type))?.long_name ?? "";
    return {
      full: r.formatted_address ?? "",
      area: get("sublocality_level_1") || get("sublocality") || get("neighborhood") || get("route"),
      city: get("locality") || get("administrative_area_level_3") || get("administrative_area_level_2"),
      pincode: get("postal_code"),
      state: get("administrative_area_level_1"),
    };
  } catch {
    return empty;
  }
}

/** URL for a browser-loaded Static Maps preview image (<img src>). */
export async function staticMapUrl(lat: number, lng: number, zoom = 16): Promise<string> {
  const key = await mapsBrowserKey();
  return `https://maps.googleapis.com/maps/api/staticmap?${staticMapParams(lat, lng, zoom, i18n.language).toString()}&key=${encodeURIComponent(key)}`;
}
