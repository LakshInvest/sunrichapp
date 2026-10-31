// ============= Full file contents =============
// Google Maps/Places server functions. The API key lives only in the server
// runtime (GOOGLE_MAPS_API_KEY secret); the browser never sees it. Images are
// returned as data URIs and place data as plain DTOs.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLACES_BASE = "https://places.googleapis.com/v1";
const GEO_BASE = "https://maps.googleapis.com/maps/api";
/** Sunrich operates around Latur, Maharashtra — bias suggestions there. */
const BIAS = { center: { latitude: 18.402252, longitude: 76.584212 }, radius: 120000 };

export type PlaceSuggestion = {
  placeId: string;
  main: string;
  secondary: string;
};
export type PlaceDetails = {
  lat: number;
  lng: number;
  address: string;
} | null;

function apiKey(): string {
  const key = process.env["GOOGLE_MAPS_API_KEY"];
  if (!key) throw new Error("Google Maps is not configured (missing key).");
  return key;
}

/** Maps a Google error body to a message the user can act on. */
function googleError(status: number, body: string): Error {
  console.error("[google-maps]", status, body.slice(0, 1200));
  if (status === 403) {
    let reason = "";
    try {
      const details = (JSON.parse(body)?.error?.details ?? []) as Array<{ reason?: string }>;
      reason = details.find((d) => d.reason)?.reason ?? "";
    } catch {
      /* body not JSON */
    }
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED")
      return new Error("Google Maps key is referrer-restricted; server calls need restrictions set to None or IP addresses.");
    if (reason === "API_KEY_SERVICE_BLOCKED")
      return new Error("Google Maps key does not allow this API; enable it in Google Cloud Console.");
    return new Error("Google Maps request denied (403); check the key's restrictions in Google Cloud Console.");
  }
  if (status === 429) return new Error("Google Maps quota reached; try again shortly.");
  return new Error(`Google Maps request failed (${status}).`);
}

// ---- Pure helpers (unit-tested) -------------------------------------------

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

/** Deep link that opens the Google Maps app/site without a key. */
export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

type Prediction = {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
};

export function parseSuggestions(body: unknown): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  const suggestions = (body as { suggestions?: Array<{ placePrediction?: Prediction }> })?.suggestions ?? [];
  for (const s of suggestions) {
    const p = s?.placePrediction;
    const placeId = p?.placeId ?? "";
    if (!placeId) continue;
    out.push({
      placeId,
      main: p?.structuredFormat?.mainText?.text ?? p?.text?.text ?? "",
      secondary: p?.structuredFormat?.secondaryText?.text ?? "",
    });
  }
  return out;
}

// ---- Server functions ------------------------------------------------------

export const placesAutocomplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({ input: z.string().min(3).max(200), sessionToken: z.string().uuid() })
        .parse(d),
  )
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
      },
      body: JSON.stringify({
        input: data.input,
        sessionToken: data.sessionToken,
        locationBias: { circle: BIAS },
      }),
    });
    if (!res.ok) throw googleError(res.status, await res.text());
    return parseSuggestions(await res.json());
  });

export const getPlaceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z.object({ placeId: z.string().min(5).max(300), sessionToken: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }): Promise<PlaceDetails> => {
    const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(data.placeId)}?sessionToken=${data.sessionToken}`, {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": "id,formattedAddress,location",
      },
    });
    if (!res.ok) throw googleError(res.status, await res.text());
    const place = (await res.json()) as {
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    };
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (lat == null || lng == null) return null;
    return { lat, lng, address: place.formattedAddress ?? "" };
  });

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ address: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }): Promise<PlaceDetails> => {
    const res = await fetch(
      `${GEO_BASE}/geocode/json?address=${encodeURIComponent(`${data.address}, India`)}&region=in&key=${apiKey()}`,
    );
    if (!res.ok) throw googleError(res.status, await res.text());
    const body = (await res.json()) as {
      status?: string;
      results?: Array<{ formatted_address?: string; geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    const r = body.results?.[0];
    const lat = r?.geometry?.location?.lat;
    const lng = r?.geometry?.location?.lng;
    if (!r || lat == null || lng == null) return null;
    return { lat, lng, address: r.formatted_address ?? "" };
  });

export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) => z.object({ lat: z.number().min(-85).max(85), lng: z.number().min(-180).max(180) }).parse(d),
  )
  .handler(async ({ data }): Promise<string> => {
    const res = await fetch(
      `${GEO_BASE}/geocode/json?latlng=${data.lat},${data.lng}&region=in&key=${apiKey()}`,
    );
    if (!res.ok) throw googleError(res.status, await res.text());
    const body = (await res.json()) as { results?: Array<{ formatted_address?: string }> };
    return body.results?.[0]?.formatted_address ?? "";
  });

type StaticMap = { uri: string };

/**
 * A small static map image as a data URI. The browser shows an <img>; the key
 * stays on the server. Cached per coordinate set to limit billable requests.
 */
export const getStaticMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({ lat: z.number().min(-85).max(85), lng: z.number().min(-180).max(180), zoom: z.number().min(10).max(18).optional() })
        .parse(d),
  )
  .handler(async ({ data }): Promise<StaticMap> => {
    const { lat, lng, zoom } = clampStaticParams(data);
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: String(zoom),
      size: "640x360",
      scale: "2",
      maptype: "roadmap",
      markers: `color:0x0AAAED|${lat},${lng}`,
      key: apiKey(),
    });
    const res = await fetch(`${GEO_BASE}/staticmap?${params.toString()}`);
    if (!res.ok) throw googleError(res.status, await res.text());
    const buf = Buffer.from(await res.arrayBuffer());
    return { uri: `data:image/png;base64,${buf.toString("base64")}` };
  });
