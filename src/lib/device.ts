/**
 * Device identity for PIN login. Browser-only helpers — call them from
 * effects/event handlers on client-only routes (the auth route is ssr:false).
 *
 * Logout must NEVER clear these keys: they are what makes PIN login work
 * on the next visit.
 */

const DEVICE_KEY = "sunrich_device_id";
const LAST_MOBILE_KEY = "sunrich_last_mobile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

const VALID_ID = /^[0-9a-f]{32,128}$/;
const VALID_MOBILE = /^[6-9]\d{9}$/;

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

/** Stable random id created once (only if missing anywhere), never regenerated. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  const backup = readCookie(DEVICE_KEY);
  if (!id || !VALID_ID.test(id)) {
    if (backup && VALID_ID.test(backup)) {
      id = backup; // restored from the cookie backup
    } else {
      id = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    }
    localStorage.setItem(DEVICE_KEY, id);
  }
  if (backup !== id) writeCookie(DEVICE_KEY, id);
  return id;
}

/** Saved ids for diagnostics (console only). */
export function savedDeviceIds() {
  return { localStorage: localStorage.getItem(DEVICE_KEY), cookie: readCookie(DEVICE_KEY) };
}

/** Short human-readable label like "Chrome · Android" from the user agent. */
export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Version\//.test(ua) && /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "Device";
  return `${browser} · ${os}`;
}

export function getLastMobile(): string | null {
  const v = localStorage.getItem(LAST_MOBILE_KEY) ?? readCookie(LAST_MOBILE_KEY);
  return v && VALID_MOBILE.test(v) ? v : null;
}

/** Saves only a real 10-digit mobile; blanks/garbage are ignored. */
export function setLastMobile(m10: string | null | undefined): boolean {
  const v = (m10 ?? "").replace(/\D/g, "").slice(-10);
  if (!VALID_MOBILE.test(v)) return false;
  localStorage.setItem(LAST_MOBILE_KEY, v);
  writeCookie(LAST_MOBILE_KEY, v);
  return true;
}

/** Only for the explicit "Use a different number" / not-registered paths — never on logout. */
export function clearLastMobile(): void {
  localStorage.removeItem(LAST_MOBILE_KEY);
  document.cookie = `${LAST_MOBILE_KEY}=; max-age=0; path=/`;
}

/** "+91 XXXXX X1234" — hides the first six digits. */
export function maskMobile(m10: string): string {
  return `+91 XXXXX X${m10.slice(-4)}`;
}
