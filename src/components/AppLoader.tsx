import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/** Full-screen calm loader: pulsing Sunrich drop with a soft ripple; "Loading…" after 1 s. */
export function AppLoader() {
  const { t } = useTranslation();
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShowText(true), 1000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background" role="status" aria-live="polite">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-secondary/30 animate-drop-ripple" aria-hidden />
        <svg viewBox="0 0 24 32" className="relative h-14 w-11 animate-drop-pulse" aria-hidden>
          <path d="M12 1C12 1 2 13 2 20a10 10 0 0 0 20 0C22 13 12 1 12 1Z" className="fill-secondary" />
          <path d="M7 21a5 5 0 0 0 5 5" className="stroke-primary-foreground/70" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <p className={`text-sm font-medium text-muted-foreground transition-opacity ${showText ? "opacity-100" : "opacity-0"}`}>
        {t("common.loading", { defaultValue: "Loading…" })}
      </p>
    </div>
  );
}
