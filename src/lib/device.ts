/**
 * Device identity for PIN login. Browser-only helpers — call them from
 * effects/event handlers on client-only routes (the auth route is ssr:false).
 */

const DEVICE_KEY = "sunrich_device_id";
const LAST_MOBILE_KEY = "sunrich_last_mobile";

/** Stable random id (64 hex chars) created on first app open. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
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
  return localStorage.getItem(LAST_MOBILE_KEY);
}

export function setLastMobile(m10: string): void {
  localStorage.setItem(LAST_MOBILE_KEY, m10);
}

export function clearLastMobile(): void {
  localStorage.removeItem(LAST_MOBILE_KEY);
}

/** "+91 XXXXX X1234" — hides the first six digits. */
export function maskMobile(m10: string): string {
  return `+91 XXXXX X${m10.slice(-4)}`;
}
