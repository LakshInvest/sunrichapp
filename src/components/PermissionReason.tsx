import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Camera, MapPin } from "lucide-react";
import type { PermissionKind } from "@/lib/permissions";

type Pending = { kind: PermissionKind; resolve: (ok: boolean) => void };
let current: Pending | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Small bottom sheet before an Android permission ask. Resolves true only on "Continue". */
export function askReason(kind: PermissionKind): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { kind, resolve };
    emit();
  });
}
function close(ok: boolean) {
  const c = current;
  current = null;
  emit();
  c?.resolve(ok);
}

const ICON = { camera: Camera, location: MapPin, notifications: Bell } as const;

export function PermissionReasonHost() {
  const { t } = useTranslation();
  const p = useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => current,
    () => null,
  );
  if (!p) return null;
  const Icon = ICON[p.kind];
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="perm-reason" className="fixed inset-0 z-[90] flex items-end bg-primary/40" onClick={() => close(false)}>
      <div className="w-full rounded-t-xl bg-card px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10"><Icon className="h-5 w-5 text-secondary" aria-hidden /></span>
          <p id="perm-reason" className="text-[15px] font-medium text-foreground">{t(`permissions.why.${p.kind}`)}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => close(false)} className="min-h-12 rounded-xl border border-border font-semibold text-foreground">{t("permissions.notNow")}</button>
          <button type="button" autoFocus onClick={() => close(true)} className="min-h-12 rounded-xl bg-primary font-semibold text-primary-foreground">{t("permissions.continue")}</button>
        </div>
      </div>
    </div>
  );
}
