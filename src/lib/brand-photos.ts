import type { BrandPhotos } from "./brand-photos.functions";

/** Only an explicit false hides a brand element; older settings default to visible. */
export function brandVisibility(settings: Record<string, unknown> = {}) {
  return {
    launchShowLogo: settings["launch_show_logo"] !== false,
    launchShowTagline: settings["launch_show_tagline"] !== false,
    loginShowLogo: settings["login_show_logo"] !== false,
    loginShowTagline: settings["login_show_tagline"] !== false,
  };
}

/** Only the screen's own Command Center photo; never the Home banner. None → brand blue. */
export function pickPhoto(own: string | null | undefined, _hero?: string | null | undefined): string | null {
  return own || null;
}

/** Save the resolved URLs where the inline launch script and the login screen read them. */
export function cacheBrandPhotos(p: BrandPhotos): void {
  try {
    localStorage.setItem("sunrich.brandVisibility", JSON.stringify(p.visibility ?? brandVisibility()));
    document.documentElement.toggleAttribute("data-launch-hide-logo", p.visibility?.launchShowLogo === false);
    document.documentElement.toggleAttribute("data-launch-hide-tagline", p.visibility?.launchShowTagline === false);
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
    if (p.logo) localStorage.setItem("sunrich.logoImg", p.logo);
    else localStorage.removeItem("sunrich.logoImg");
    if (p.texts) localStorage.setItem("sunrich.loginTexts", JSON.stringify(p.texts));
    localStorage.removeItem("sunrich.launchPos");
  } catch {
    /* best effort */
  }
}

/** Command Center login text in the chosen language; null → app's own text. */
export function loginText(texts: BrandPhotos["texts"] | null | undefined, key: keyof NonNullable<BrandPhotos["texts"]>, lang: string): string | null {
  const v = texts?.[key];
  if (!v) return null;
  return (lang === "hi" ? v.hi : lang === "mr" ? v.mr : null) ?? v.en ?? null;
}
