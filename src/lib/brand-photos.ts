import type { BrandPhotos } from "./brand-photos.functions";

/** Source order: own setting → Home hero photo → none (navy). */
export function pickPhoto(own: string | null | undefined, hero: string | null | undefined): string | null {
  return own || hero || null;
}

/** Save the resolved URLs where the inline launch script and the login screen read them. */
export function cacheBrandPhotos(p: BrandPhotos): void {
  try {
    for (const [k, v] of [
      ["sunrich.loginImg", pickPhoto(p.login, p.hero)],
      ["sunrich.launchImg", pickPhoto(p.launch, p.hero)],
    ] as const) {
      if (v) {
        localStorage.setItem(k, v);
        const img = new Image(); // warm the HTTP cache so the next open is instant
        img.src = v;
      } else localStorage.removeItem(k);
    }
  } catch {
    /* best effort */
  }
}
