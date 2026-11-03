import { useEffect, useState } from "react";
import splashLogo from "@/assets/splash-logo.png.asset.json";
import { markFirstScreen } from "@/lib/native";

/**
 * Web launch frame — identical to the native splash (navy, same logo, same size and
 * position: the native image is a 2732² CENTER_CROP, so the logo box is scaled by
 * max(vw, vh)/2732). It is in the server HTML, so it paints before any JS. Then a 2 s
 * animation plays (logo grows slightly, one wave, tagline fades in) while the app loads
 * underneath, and it fades into Login / PIN / Home.
 */
export function LaunchSplash() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");
  useEffect(() => {
    // Our identical frame is painted: hide the native splash now (the switch is invisible).
    markFirstScreen();
    const a = setTimeout(() => setPhase("fade"), 2000);
    const b = setTimeout(() => setPhase("gone"), 2350);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  if (phase === "gone") return null;
  return (
    <div
      aria-hidden
      data-testid="launch-splash"
      className={`launch-splash fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-300 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}
    >
      <img src={splashLogo.url} alt="" className="launch-logo" fetchPriority="high" decoding="sync" />
      <svg className="launch-wave" viewBox="0 0 200 20" preserveAspectRatio="none">
        <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10" fill="none" stroke="var(--secondary)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="launch-tagline font-deva">शुद्ध पियो शुद्ध जियो</p>
    </div>
  );
}
