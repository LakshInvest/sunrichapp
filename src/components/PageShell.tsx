import type { HTMLAttributes, ReactNode } from "react";
import { OfflineBanner } from "./OfflineBanner";

/**
 * Shared page shell for every screen: centred mobile column, dvh height
 * (never scrolls past the viewport), horizontal-overflow guard, the offline
 * banner and a consistent font context. Screens pass their own spacing,
 * sticky header and fixed bars as children (plus touch handlers where the
 * screen supports pull-to-refresh).
 */
export function PageShell({
  className = "",
  children,
  ...rest
}: { className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <main className={`mx-auto min-h-dvh max-w-md overflow-x-clip bg-background ${className}`} {...rest}>
      <OfflineBanner />
      {children}
    </main>
  );
}
