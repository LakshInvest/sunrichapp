import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { useOffline } from "@/hooks/use-offline";

/** Slim fixed banner at the top of the screen when the connection drops. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-foreground/90 px-4 py-1.5 text-xs font-semibold text-background backdrop-blur-sm"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      {t("offline.title")}
    </div>
  );
}
