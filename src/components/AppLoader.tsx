import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottleLoader } from "@/components/BottleLoader";
import { isNative } from "@/lib/native";

/**
 * Launch loader on the navy brand screen. Inside the Android app the native
 * splash covers this time, so only the plain navy screen renders (no flash).
 */
export function AppLoader() {
  const { t } = useTranslation();
  const [showText, setShowText] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNative());
    const id = setTimeout(() => setShowText(true), 1000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-primary" role="status" aria-live="polite">
      {!native && (
        <>
          <BottleLoader className="h-16 w-16 text-secondary" />
          <p className={`text-sm font-medium text-primary-foreground/80 transition-opacity ${showText ? "opacity-100" : "opacity-0"}`}>
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        </>
      )}
    </div>
  );
}
