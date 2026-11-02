import type { HTMLAttributes, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { OfflineBanner } from "./OfflineBanner";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

/** Small spinner that follows the finger while pulling down. */
export function PullIndicator({ offset, spinning }: { offset: number; spinning: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex justify-center"
      style={{ transform: `translateY(${Math.max(0, offset - 16)}px)` }}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-md ${spinning ? "animate-spin" : ""}`}>
        <RefreshCw className="h-4 w-4 text-secondary" />
      </span>
    </div>
  );
}

function RefreshShell({
  onRefresh,
  className,
  children,
  ...rest
}: { onRefresh: () => unknown; className: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  const pull = usePullToRefresh(onRefresh);
  return (
    <main className={className} {...rest} {...pull.handlers}>
      {pull.indicator && <PullIndicator offset={pull.offset} spinning={pull.spinning} />}
      <OfflineBanner />
      {children}
    </main>
  );
}

/**
 * Shared page shell for every screen: centred mobile column, dvh height,
 * horizontal-overflow guard, the offline banner and a consistent font
 * context. Pass `onRefresh` to enable pull-to-refresh.
 */
export function PageShell({
  className = "",
  children,
  onRefresh,
  ...rest
}: { className?: string; children: ReactNode; onRefresh?: () => unknown } & HTMLAttributes<HTMLElement>) {
  const cls = `mx-auto min-h-dvh max-w-md overflow-x-clip bg-background ${className}`;
  if (onRefresh) {
    return (
      <RefreshShell onRefresh={onRefresh} className={cls} {...rest}>
        {children}
      </RefreshShell>
    );
  }
  return (
    <main className={cls} {...rest}>
      <OfflineBanner />
      {children}
    </main>
  );
}
