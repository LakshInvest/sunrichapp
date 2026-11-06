import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Camera, MapPin } from "lucide-react";
import { isNative } from "@/lib/native";
import { markPermissionsSeen, requestAllPermissions, shouldShowPermissionsIntro } from "@/lib/permissions";
import { useLang } from "@/hooks/use-lang";

const ITEMS = [
  ["notifications", Bell],
  ["location", MapPin],
  ["camera", Camera],
] as const;

/** One clean screen after the first login: what Sunrich needs and why. Shown once per device. */
export function PermissionsIntro() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOpen(shouldShowPermissionsIntro()), []);
  if (!open) return null;
  // The website cannot use the camera this way, so only list it in the phone app.
  const items = isNative() ? ITEMS : ITEMS.filter(([k]) => k !== "camera");
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-title"
      className={`fixed inset-0 z-[70] overflow-y-auto bg-background ${lang === "en" ? "" : "font-deva"}`}
    >
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
        <h1 id="perm-title" className="text-2xl font-bold text-primary">{t("permissions.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("permissions.subtitle")}</p>
        <ul className="mt-8 space-y-5">
          {items.map(([kind, Icon]) => (
            <li key={kind} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{t(`permissions.${kind}`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`permissions.${kind}Reason`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-10">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void requestAllPermissions().finally(() => setOpen(false));
            }}
            className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
          >
            {t("permissions.allow")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              markPermissionsSeen();
              setOpen(false);
            }}
            className="mt-2 min-h-12 w-full rounded-xl font-semibold text-muted-foreground"
          >
            {t("permissions.later")}
          </button>
        </div>
      </div>
    </section>
  );
}
