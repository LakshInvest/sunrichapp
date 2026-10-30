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
export async function initNative(opts: { isHome: () => boolean; onExitHint: () => void }): Promise<() => void> {
  if (!isNative()) return () => undefined;
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);
  void StatusBar.setBackgroundColor({ color: "#0B2545" }).catch(() => undefined);
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  void SplashScreen.hide().catch(() => undefined);
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
  return () => void handle.remove();
}
