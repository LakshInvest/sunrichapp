import jar20l from "@/assets/products/jar-20l.jpg";
import bottle250Pack from "@/assets/products/bottle-250-pack.jpg";
import bottle500Pack from "@/assets/products/bottle-500-pack.jpg";
import bottle1lPack from "@/assets/products/bottle-1l-pack.jpg";
import bottle2lPack from "@/assets/products/bottle-2l-pack.jpg";
import can5l from "@/assets/products/can-5l.jpg";
import beverageLemonPack from "@/assets/products/beverage-lemon-pack.jpg";
import beverageOrangePack from "@/assets/products/beverage-orange-pack.jpg";
import type { CatalogProduct } from "@/lib/catalogue";

/**
 * Bundled sample photos reused as a fallback until real catalogue images
 * are uploaded to the public "catalogue" bucket.
 */
const BY_CODE: Record<string, string> = {
  "JAR-20L": jar20l,
  "BTL-250-24": bottle250Pack,
  "BTL-500-24": bottle500Pack,
  "BTL-1L-12": bottle1lPack,
  "BTL-2L-9": bottle2lPack,
  "CAN-5L": can5l,
  "BEV-SPK-24": beverageLemonPack,
  "BEV-SODA-24": beverageOrangePack,
};

export function fallbackImageFor(product: CatalogProduct): string | null {
  if (product.imageUrl || product.images.length > 0) return null;
  return BY_CODE[product.code] ?? null;
}

export const JAR_HERO_IMAGE = jar20l;
