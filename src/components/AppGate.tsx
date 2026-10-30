import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouterState } from "@tanstack/react-router";
import { Download, Wrench, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SupportBlock } from "@/components/LegalPage";
import { fetchAppInfo, gateState, type AppInfo, type GateState } from "@/lib/app-info";
import { openExternal } from "@/lib/native";

const DISMISS_KEY = "sunrich.updateDismissed";
const PUBLIC = ["/privacy", "/terms", "/delete-account"];

/** Start-up check of public_app_info(): maintenance, forced update, update bar. */
export function AppGate() {
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [state, setState] = useState<GateState>("ok");
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetchAppInfo().then(
      (i) => {
        setInfo(i);
        const g = gateState(i);
        setState(g);
        try {
          setDismissed(localStorage.getItem(DISMISS_KEY) === i.latestVersion);
        } catch {
          setDismissed(false);
        }
      },
      () => undefined, // never block the app if the check fails
    );
  }, []);

  if (!info || state === "ok" || PUBLIC.includes(path)) return null;
  const store = info.playStoreUrl ?? "https://play.google.com/store/apps/details?id=com.sunrich.app";

  if (state === "update_available") {
    if (dismissed) return null;
    return (
      <div role="status" className="fixed inset-x-0 top-0 z-[60] bg-primary text-primary-foreground pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-1.5 text-sm">
          <span className="flex-1">{t("gate.updateAvailable")}</span>
          <button type="button" onClick={() => openExternal(store)} className="min-h-11 rounded-lg bg-accent px-3 font-semibold text-accent-foreground">
            {t("gate.update")}
          </button>
          <button
            type="button"
            aria-label={t("gate.dismiss")}
            onClick={() => {
              try {
                localStorage.setItem(DISMISS_KEY, info.latestVersion ?? "");
              } catch {
                /* ignore */
              }
              setDismissed(true);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="alertdialog" aria-modal className="fixed inset-0 z-[70] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <Logo />
        <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          {state === "maintenance" ? <Wrench className="h-8 w-8" aria-hidden /> : <Download className="h-8 w-8" aria-hidden />}
        </div>
        <h1 className="mt-4 text-xl font-bold text-primary">
          {state === "maintenance" ? t("gate.maintenanceTitle") : t("gate.forceTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground">{state === "maintenance" ? info.maintenance : t("gate.forceBody")}</p>
        {state === "force_update" && (
          <button
            type="button"
            onClick={() => openExternal(store)}
            className="mt-6 min-h-[52px] w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground"
          >
            {t("gate.openStore")}
          </button>
        )}
        {state === "maintenance" && (
          <div className="w-full text-left">
            <SupportBlock info={info} />
          </div>
        )}
      </div>
    </div>
  );
}
