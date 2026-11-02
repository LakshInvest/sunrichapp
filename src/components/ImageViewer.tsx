import { useRef, useState, type TouchEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useBackClose } from "@/hooks/use-back-close";

const dist = (t: TouchEvent["touches"]) =>
  Math.hypot((t[0]?.clientX ?? 0) - (t[1]?.clientX ?? 0), (t[0]?.clientY ?? 0) - (t[1]?.clientY ?? 0));

/** Full-screen image with pinch-zoom (1–4×), drag when zoomed, tap/back to close. */
export function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const { t } = useTranslation();
  const dismiss = useBackClose(true, onClose);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const g = useRef<{ d: number; s: number; x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  const start = (e: TouchEvent) => {
    const tt = e.touches;
    g.current = { d: tt.length > 1 ? dist(tt) : 0, s: scale, x: tt[0]!.clientX, y: tt[0]!.clientY, px: pos.x, py: pos.y, moved: false };
  };
  const move = (e: TouchEvent) => {
    const s0 = g.current;
    if (!s0) return;
    const tt = e.touches;
    if (tt.length > 1 && s0.d > 0) {
      s0.moved = true;
      setScale(Math.min(4, Math.max(1, (s0.s * dist(tt)) / s0.d)));
    } else if (scale > 1) {
      s0.moved = true;
      setPos({ x: s0.px + tt[0]!.clientX - s0.x, y: s0.py + tt[0]!.clientY - s0.y });
    }
  };
  const end = () => {
    if (scale <= 1.02) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/95"
      style={{ touchAction: "none" }}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onClick={() => {
        if (!g.current?.moved && scale === 1) dismiss();
        if (g.current) g.current.moved = false;
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        onDoubleClick={() => {
          setScale((s) => (s > 1 ? 1 : 2.5));
          setPos({ x: 0, y: 0 });
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label={t("common.close")}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-background/20 text-background"
      >
        <X className="h-6 w-6" aria-hidden />
      </button>
    </div>
  );
}
