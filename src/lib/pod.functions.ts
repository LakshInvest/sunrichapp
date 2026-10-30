// ============= Full file contents =============
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PodUrls = { photoUrl: string | null; signatureUrl: string | null };

/**
 * Splits a stored path into bucket + object. Paths are stored either as
 * "bucket/path" or as a bare path inside the operations bucket (driver uploads).
 */
export function storagePathParts(
  path: string,
  defaultBucket = "operations",
): { bucket: string; object: string } | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const [first, ...rest] = clean.split("/");
  if (!rest.length) return null;
  // A bare single-segment path is not a bucket name; treat it as operations content.
  const known = ["operations", "customer-docs", "avatars", "company-assets", "catalogue"];
  const bucket = known.includes(first) ? first : defaultBucket;
  return { bucket, object: bucket === first ? rest.join("/") : clean };
}

/**
 * Short-lived signed URLs for proof-of-delivery images. The caller's access to
 * the order is verified through RLS first; trip_stops and the storage signing
 * are then done with the service role because the operations bucket is
 * staff-only for reads, so the browser cannot create signed URLs itself.
 */
export const getPodUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<PodUrls> => {
    const none: PodUrls = { photoUrl: null, signatureUrl: null };
    const { data: order } = await context.supabase
      .from("orders")
      .select("id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return none;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stops } = await supabaseAdmin
      .from("trip_stops")
      .select("photo_url, signature_url")
      .eq("order_id", data.orderId)
      .order("delivered_at", { ascending: false, nullsFirst: false })
      .limit(1);
    const s = stops?.[0];
    if (!s) return none;

    const sign = async (path: string | null): Promise<string | null> => {
      if (!path) return null;
      if (/^https?:/i.test(path)) return path;
      const parts = storagePathParts(path);
      if (!parts) return null;
      const { data: u, error } = await supabaseAdmin.storage.from(parts.bucket).createSignedUrl(parts.object, 900);
      if (error) {
        console.error("[sunrich] pod signed url failed", error.message);
        return null;
      }
      return u?.signedUrl ?? null;
    };

    return { photoUrl: await sign(s.photo_url), signatureUrl: await sign(s.signature_url) };
  });
