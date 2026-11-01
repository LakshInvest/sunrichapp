import { Capacitor } from "@capacitor/core";

/**
 * Thin bridge to Capacitor plugins. Everything is a no-op / web fallback in
 * the browser, so the published web app behaves exactly as before.
 */
export const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

/** Opens a web page in the in-app browser (native) or a new tab (web). */
export async function openInApp(url: string): Promise<void> {
  if (isNative()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, toolbarColor: "#0B2545" });
    return;
  }
  window.open(url, "_blank", "noopener");
}

/** tel:, mailto:, wa.me and map links hand off to native apps. */
export function openExternal(url: string): void {
  if (isNative() && url.startsWith("http")) {
    window.open(url, "_system");
    return;
  }
  window.location.href = url;
}

/**
 * Native shell setup: status bar colour, splash hide, hardware back button.
 * Back closes an open sheet/dialog first (they own a history entry), then
 * goes back one screen; on Home a second press within 2 s exits.
 */
export async function initNative(opts: {
  isHome: () => boolean;
  onExitHint: () => void;
  /** Deep-link navigation, e.g. sunrich://order/<id> → /track/<id>. */
  openPath?: (path: string) => void;
}): Promise<() => void> {
  if (!isNative()) return () => undefined;
  // Status-bar colours are set per route by applyStatusBar (src/lib/status-bar.ts).
  const [{ App }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/splash-screen"),
  ]);
  void SplashScreen.hide().catch(() => undefined);

  // sunrich://order/<id> and https://…/order/<id> open that order.
  const urlOpen = await App.addListener("appUrlOpen", ({ url }) => {
    const m = /^(?:sunrich:\/\/order\/|https:\/\/[^/]+\/order\/)([A-Za-z0-9_-]+)/.exec(url);
    if (m && opts.openPath) opts.openPath(`/track/${m[1]}`);
  });

  let lastBack = 0;
  const handle = await App.addListener("backButton", () => {
    const sheetOpen = !!document.querySelector('[role="dialog"][data-state="open"], [vaul-drawer][data-state="open"]');
    if (sheetOpen || (history.state && history.state.sunrichSheet)) {
      history.back();
      return;
    }
    if (opts.isHome()) {
      const now = Date.now();
      if (now - lastBack < 2000) {
        void App.exitApp();
      } else {
        lastBack = now;
        opts.onExitHint();
      }
      return;
    }
    history.back();
  });
  const localTaps = opts.openPath ? await listenLocalNotificationTaps(opts.openPath) : () => undefined;
  return () => {
    localTaps();
    void urlOpen.remove();
    void handle.remove();
  };
}

/* ---------- Device features, each with a browser fallback ---------- */

/** Current position (native GPS or browser geolocation). */
export async function getPosition(): Promise<{ lat: number; lng: number }> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    await Geolocation.requestPermissions().catch(() => undefined);
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  }
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000 },
    ),
  );
}

/** Take or pick a photo. Returns a File, or null when cancelled / on web (use <input type=file>). */
export async function pickPhoto(source: "camera" | "photos" = "camera"): Promise<File | null> {
  if (!isNative()) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });
    if (!photo.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    return new File([blob], `photo.${photo.format || "jpg"}`, { type: blob.type || "image/jpeg" });
  } catch {
    return null;
  }
}

/** Native share sheet, Web Share API, or copy to clipboard. */
export async function shareLink(opts: { title?: string; text?: string; url?: string }): Promise<void> {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share(opts).catch(() => undefined);
    return;
  }
  if (navigator.share) {
    await navigator.share(opts).catch(() => undefined);
    return;
  }
  await navigator.clipboard?.writeText([opts.text, opts.url].filter(Boolean).join(" ")).catch(() => undefined);
}

/** Short vibration on taps (native only). */
export async function haptic(style: "light" | "medium" | "heavy" = "light"): Promise<void> {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  await Haptics.impact({ style: map[style] }).catch(() => undefined);
}

/** Exits the Android app (no-op on web). Used by the "Exit app?" dialog. */
export async function exitApp(): Promise<void> {
  if (!isNative()) return;
  const { App } = await import("@capacitor/app");
  App.exitApp();
}

/** Online/offline listener (native Network plugin or browser events). */
export async function onNetworkChange(cb: (online: boolean) => void): Promise<() => void> {
  if (isNative()) {
    const { Network } = await import("@capacitor/network");
    const h = await Network.addListener("networkStatusChange", (s) => cb(s.connected));
    return () => void h.remove();
  }
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online", on);
  window.addEventListener("offline", off);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", off);
  };
}

/** Durable key/value storage (survives WebView storage clears on native). */
export async function prefGet(key: string): Promise<string | null> {
  if (isNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    return (await Preferences.get({ key })).value;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export async function prefSet(key: string, value: string): Promise<void> {
  if (isNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Show a local notification on the "Orders" channel (native only). */
export async function notifyLocal(title: string, body: string, url?: string): Promise<void> {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") return;
  await LocalNotifications.createChannel({ id: "orders", name: "Orders", importance: 4 }).catch(() => undefined);
  await LocalNotifications.schedule({
    notifications: [{ id: Date.now() % 2147483647, title, body, channelId: "orders", extra: { url } }],
  });
}

/** Tapping a local notification opens its screen. */
export async function listenLocalNotificationTaps(openPath: (p: string) => void): Promise<() => void> {
  if (!isNative()) return () => undefined;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const h = await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
    const url = (a.notification.extra as { url?: string } | undefined)?.url;
    if (url && url.startsWith("/")) openPath(url);
  });
  return () => void h.remove();
}
