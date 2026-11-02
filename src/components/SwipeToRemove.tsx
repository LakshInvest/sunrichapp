import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

/** Swipe a row left past ~40% of its width to remove it (red bin shows behind). */
export function SwipeToRemove({
  children,
  onRemove,
  label,
  disabled,
}: {
  children: ReactNode;
  onRemove: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; horiz: boolean | null } | null>(null);
  const width = useRef(1);

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {dx !== 0 && <div aria-hidden className="absolute inset-0 flex items-center justify-end rounded-2xl bg-destructive px-5 text-destructive-foreground">
        <Trash2 className="h-5 w-5" />
        <span className="ml-2 text-sm font-semibold">{label}</span>
      </div>}
      <div
        className="relative"
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? "none" : "transform 180ms ease-out" }}
        onTouchStart={(e) => {
          if (disabled) return;
          width.current = e.currentTarget.offsetWidth || 1;
          start.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, horiz: null };
        }}
        onTouchMove={(e) => {
          const s = start.current;
          if (!s) return;
          const mx = e.touches[0]!.clientX - s.x;
          const my = e.touches[0]!.clientY - s.y;
          if (s.horiz === null && Math.abs(mx) + Math.abs(my) > 8) s.horiz = Math.abs(mx) > Math.abs(my);
          if (s.horiz) setDx(Math.min(0, mx));
        }}
        onTouchEnd={() => {
          const removed = -dx > width.current * 0.4;
          start.current = null;
          if (removed) {
            setDx(-width.current);
            window.setTimeout(onRemove, 160);
          } else setDx(0);
        }}
        onTouchCancel={() => {
          start.current = null;
          setDx(0);
        }}
      >
        {children}
      </div>
    </li>
  );
}
