import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottleLoader } from "@/components/BottleLoader";

/** Full-screen calm loader: a filling Sunrich bottle; "Loading…" after 1 s. */
export function AppLoader() {
  const { t } = useTranslation();
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShowText(true), 1000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background" role="status" aria-live="polite">
      <BottleLoader className="h-16 w-16 text-secondary" />
      <p className={`text-sm font-medium text-muted-foreground transition-opacity ${showText ? "opacity-100" : "opacity-0"}`}>
        {t("common.loading", { defaultValue: "Loading…" })}
      </p>
    </div>
  );
}
