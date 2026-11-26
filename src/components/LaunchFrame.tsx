import { useEffect, useState } from "react";
import whiteLogo from "@/assets/brand/sunrich-logo-white.png.asset.json";

/** Inline, runs before first paint: shows the last saved brand image (no JS bundle needed). */
export const LAUNCH_SCRIPT = `try{var d=document.documentElement,h=/^https:\\/\\//,u=localStorage.getItem("sunrich.launchImg"),g=localStorage.getItem("sunrich.logoImg"),q=localStorage.getItem("sunrich.launchPos"),v=JSON.parse(localStorage.getItem("sunrich.brandVisibility")||"{}");d.toggleAttribute("data-launch-hide-logo",v.launchShowLogo===false);d.toggleAttribute("data-launch-hide-tagline",v.launchShowTagline===false);if(u&&h.test(u)){d.style.setProperty("--launch-img","url("+JSON.stringify(u)+")");d.setAttribute("data-launch-img","");if(q==="70% center")d.style.setProperty("--launch-pos",q);var l=document.createElement("link");l.rel="preload";l.as="image";l.href=u;document.head.appendChild(l)}if(g&&h.test(g)){d.style.setProperty("--launch-logo","url("+JSON.stringify(g)+")");d.setAttribute("data-launch-logo","")}var t=JSON.parse(localStorage.getItem("sunrich.loginTexts")||"{}").login_tagline,L=localStorage.getItem("sunrich.lang")||localStorage.getItem("i18nextLng")||"en",s=t&&(t[L]||t.en);if(s)d.style.setProperty("--launch-tag",JSON.stringify(String(s)))}catch(e){}`;

/** Static brand screen used while the app loads. No animation, no spinner. */
export function LaunchArt() {
  return (
    <div aria-hidden className="launch-frame">
      <div className="launch-shade" />
      <div className="launch-mark">
        <img src={whiteLogo.url} alt="" className="launch-fallback" fetchPriority="high" />
        <span className="launch-logo" />
        <span className="launch-tag" />
      </div>
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
