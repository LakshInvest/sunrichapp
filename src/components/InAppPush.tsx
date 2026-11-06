import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";

type Push = { id: number; title: string; body: string; onOpen?: () => void };
let current: Push | null = null;
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Notification arrived while the app is open: neat card at the top. */
export function showInAppPush(p: Omit<Push, "id">) {
  current = { ...p, id: ++seq };
  emit();
}
function close() {
  current = null;
  emit();
}

export function InAppPushHost() {
  const { t } = useTranslation();
  const p = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => current,
    () => null,
  );
  const startX = useRef<number | null>(null);
  useEffect(() => {
    if (!p) return;
    const id = setTimeout(close, 5000);
    return () => clearTimeout(id);
  }, [p]);
  if (!p) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[90] mx-auto max-w-md animate-in slide-in-from-top-4 fade-in duration-300"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current != null && Math.abs(e.clientX - startX.current) > 60) close();
        startX.current = null;
      }}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => {
            const go = p.onOpen;
            close();
            go?.();
          }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{p.title}</span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{p.body}</span>
          </span>
        </button>
        <button type="button" onClick={close} aria-label={t("common.close", { defaultValue: "Close" })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
