import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

export type MessageKind = "delivery" | "payment" | "stock" | "hold" | "offline" | "camera";

export type MessageOptions = {
  kind: MessageKind;
  /** Override the default one-line text (i18n key). */
  textKey?: string;
  /** Override the button label (i18n key). */
  buttonKey?: string;
  onAction?: () => void;
};

let current: MessageOptions | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Important message: centred card with a small illustration, one title, one line, one button. */
export function showMessage(o: MessageOptions) {
  current = o;
  emit();
}
export function dismissMessage() {
  current = null;
  emit();
}

const ART: Record<MessageKind, string> = {
  delivery: "M8 34h26V18H8z M34 26h10l6 8v8H34 M17 44a4 4 0 1 0 0 .1 M42 44a4 4 0 1 0 0 .1",
  payment: "M10 17h40v28H10z M10 25h40 M18 36h10",
  stock: "M12 22l18-9 18 9v20l-18 9-18-9z M12 22l18 9 18-9 M30 31v20",
  hold: "M30 9l18 7v13c0 12-18 22-18 22S12 41 12 29V16z M25 25v12 M35 25v12",
  offline: "M10 25q20-16 40 0 M17 33q13-10 26 0 M25 41q5-4 10 0 M30 48h.1",
  camera: "M10 20h10l4-5h12l4 5h10v26H10z M30 40a7 7 0 1 0 0-14 7 7 0 0 0 0 14",
};

export function MessageCardHost() {
  const { t } = useTranslation();
  const m = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => current,
    () => null,
  );
  if (!m) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="msg-title"
      aria-describedby="msg-text"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-primary/50 px-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={dismissMessage}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-card p-6 text-center shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <svg
          viewBox="0 0 60 60"
          className="mx-auto h-20 w-20 rounded-2xl bg-secondary/10 p-3 text-secondary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d={ART[m.kind]} />
        </svg>
        <h2 id="msg-title" className="mt-4 text-lg font-bold text-foreground">{t(`messages.${m.kind}Title`)}</h2>
        <p id="msg-text" className="mt-1 text-sm text-muted-foreground">{t(m.textKey ?? `messages.${m.kind}Text`)}</p>
        <button
          type="button"
          autoFocus
          onClick={() => {
            const act = m.onAction;
            dismissMessage();
            act?.();
          }}
          className="mt-5 min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
        >
          {t(m.buttonKey ?? "messages.ok")}
        </button>
      </div>
    </div>
  );
}
