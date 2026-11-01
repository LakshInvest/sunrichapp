import type { HTMLAttributes, ReactNode } from "react";
import { OfflineBanner } from "./OfflineBanner";

/**
 * Shared page shell for every screen: centred mobile column, dvh height
 * (never scrolls past the viewport), horizontal-overflow guard, the offline
 * banner and a consistent font context. Screens pass their own spacing,
 * sticky header and fixed bars as children.
 */
export function PageShell({
  className = "",
  touchHandlers,
  children,
  ...rest
}: {
  className?: string;
  touchHandlers?: Pick<HTMLAttributes<HTMLElement>, "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTouchCancel">;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTouchCancel">) {
  return (
    <main
      className={`mx-auto min-h-dvh max-w-md overflow-x-clip bg-background ${className}`}
      {...touchHandlers}
      {...rest}
    >
      <OfflineBanner />
      {children}
    </main>
  );
}
