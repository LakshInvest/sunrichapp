import { useBrand } from "@/lib/brand";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import navyLogo from "@/assets/brand/sunrich-logo-navy.png.asset.json";
import whiteLogo from "@/assets/brand/sunrich-logo-white.png.asset.json";

/** Real Sunrich logo from public_app_info (bundled asset as fallback). */
export function Logo({
  size = "lg",
  variant = "navy",
  className,
}: {
  size?: "md" | "lg";
  variant?: "navy" | "white";
  className?: string;
}) {
  const { lang } = useLang();
  const brand = useBrand(lang);
  const big = size === "lg";
  return (
    <img
      src={variant === "white" ? brand.logoDark : brand.logoLight}
      alt="Sunrich"
      className={cn(big ? "h-11 w-auto" : "h-8 w-auto", variant === "white" && "brightness-0 invert", className)}
      onError={(e) => { const fallback = variant === "white" ? whiteLogo.url : navyLogo.url; if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }}
      draggable={false}
    />
  );
}
