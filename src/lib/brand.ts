/** Brand (logo URLs, colours, tagline) from public_app_info so Command Center changes apply here. */
import { useEffect, useState } from "react";
import logoNavyAsset from "@/assets/brand/sunrich-logo-navy.png.asset.json";
import logoWhiteAsset from "@/assets/brand/sunrich-logo-white.png.asset.json";
import { fetchAppInfo } from "@/lib/app-info";
import type { Lang } from "@/lib/i18n";

export type Brand = {
  logoLight: string;
  logoDark: string;
  tagline: string;
  primary: string;
  accent: string;
};

const FALLBACK: Brand = {
  logoLight: logoNavyAsset.url,
  logoDark: logoWhiteAsset.url,
  tagline: "Shudh Piyo, Khoob Jiyo",
  primary: "#0D3278",
  accent: "#0AAAED",
};

export function brandFromInfo(info: Awaited<ReturnType<typeof fetchAppInfo>>, lang: Lang): Brand {
  return {
    logoLight: info.logoOnLightUrl ?? FALLBACK.logoLight,
    logoDark: info.logoOnDarkUrl ?? FALLBACK.logoDark,
    tagline: info.loginTagline[lang] ?? info.loginTagline.en ?? FALLBACK.tagline,
    primary: info.brandPrimary ?? FALLBACK.primary,
    accent: info.brandAccent ?? FALLBACK.accent,
  };
}

/** Resolves once from the cached public_app_info read; falls back to bundled assets. */
export function useBrand(lang: Lang = "en"): Brand {
  const [brand, setBrand] = useState<Brand>(FALLBACK);
  useEffect(() => {
    let alive = true;
    fetchAppInfo()
      .then((info) => {
        if (alive) setBrand(brandFromInfo(info, lang));
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      alive = false;
    };
  }, [lang]);
  return brand;
}
