/** Tiny bottle that fills with water — the app's loader instead of spinners. */
export function BottleLoader({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={className} aria-hidden>
      <defs>
        <clipPath id="bottle-clip">
          <path d="M9 1h6v4.2c2 1.6 3 3.5 3 6.3V27a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V11.5c0-2.8 1-4.7 3-6.3V1Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#bottle-clip)">
        <rect
          x="-2"
          y="-34"
          width="28"
          height="36"
          className="animate-bottle-fill"
          style={{ transformBox: "fill-box" }}
          fill="currentColor"
          opacity="0.28"
        />
      </g>
      <path
        d="M9 1h6v4.2c2 1.6 3 3.5 3 6.3V27a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V11.5c0-2.8 1-4.7 3-6.3V1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.2 6.6h7.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
