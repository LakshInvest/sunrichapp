import { useEffect, useState } from "react";
import splashLogo from "@/assets/splash-logo.png.asset.json";

/** Inline, runs before first paint: shows the last saved brand image (no JS bundle needed). */
export const LAUNCH_SCRIPT = `try{var u=localStorage.getItem("sunrich.launchImg");if(u&&/^https:\\/\\//.test(u)){var d=document.documentElement;d.style.setProperty("--launch-img","url("+JSON.stringify(u)+")");d.setAttribute("data-launch-img","")}}catch(e){}`;

/** Static brand screen used while the app loads. No animation, no spinner. */
export function LaunchArt() {
  return (
    <div aria-hidden className="launch-frame">
      <img src={splashLogo.url} alt="" fetchPriority="high" />
    </div>
  );
}

/**
 * Server-rendered launch frame: paints before any JS, then disappears the moment the
 * first real screen (Login / Home / any settled route) calls markFirstScreen().
 */
export function LaunchFrame() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const hide = () => setGone(true);
    window.addEventListener("sunrich:first-screen", hide);
    const safety = setTimeout(hide, 8000);
    return () => {
      window.removeEventListener("sunrich:first-screen", hide);
      clearTimeout(safety);
    };
  }, []);
  if (gone) return null;
  return (
    <div data-testid="launch-frame" className="fixed inset-0 z-[9999]">
      <LaunchArt />
    </div>
  );
}
