import { useId } from "react";

const BOTTLE = "M9 1h6v4.2c2 1.6 3 3.5 3 6.3V27a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V11.5c0-2.8 1-4.7 3-6.3V1Z";

/**
 * Tiny bottle that fills with water — the app's loader instead of spinners.
 * The water is clipped to the bottle outline and animated with SVG <animate>
 * (CSS transforms inside a clipPath leak outside it on Android WebView).
 */
export function BottleLoader({ className = "h-8 w-8" }: { className?: string }) {
  const clip = `bottle-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 32" className={className} aria-hidden>
      <defs>
        <clipPath id={clip} clipPathUnits="userSpaceOnUse">
          <path d={BOTTLE} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="32" width="24" height="32" fill="currentColor" opacity="0.45">
          <animate attributeName="y" values="32;4;32" dur="2.4s" repeatCount="indefinite" />
        </rect>
      </g>
      <path d={BOTTLE} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.2 6.6h7.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
