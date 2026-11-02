/**
 * The only service-worker registrar. Registers /sw.js on the published site
 * (and inside the Android app, which loads the published site). Never in dev,
 * Lovable previews or iframes; there it removes any stale /sw.js instead.
 */
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const PREVIEW_HOSTS = ["id-preview--15f0a66a-24b6-4e00-8874-bc0bdbe0b620.lovable.app"];

export function swAllowed(hostname: string, search: string, prod: boolean, inIframe: boolean): boolean {
  const h = hostname.toLowerCase();
  if (!prod || inIframe) return false;
  if (new URLSearchParams(search).get("sw") === "off") return false;
  if (h === "localhost" || h === "127.0.0.1") return false;
  const first = h.split(".")[0] ?? "";
  if (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h) && PREVIEW_LABEL.test(first)) return false;
  if (PREVIEW_HOSTS.includes(h)) return false;
  if (/^project--[a-z0-9-]+-dev\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h)) return false;
  for (const d of ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) {
    if (h === d || h.endsWith(`.${d}`)) return false;
  }
  return true;
}

async function unregisterAppSw() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => [r.active, r.waiting, r.installing].some((w) => w?.scriptURL.endsWith("/sw.js")))
      .map((r) => r.unregister()),
  );
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = true;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  if (!swAllowed(window.location.hostname, window.location.search, import.meta.env.PROD, inIframe)) {
    void unregisterAppSw().catch(() => undefined);
    return;
  }
  // After first paint so it never competes with the app's own requests.
  const go = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  if (document.readyState === "complete") setTimeout(go, 1500);
  else window.addEventListener("load", () => setTimeout(go, 1500), { once: true });
}
