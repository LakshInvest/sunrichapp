import { isNative } from "./native";

/** Pages whose top edge is dark navy: they need light status-bar icons. */
const DARK_TOP = [/^\/home$/, /^\/auth$/, /^\/$/];

export function isDarkTop(pathname: string): boolean {
  return DARK_TOP.some((r) => r.test(pathname));
}

/**
 * Status-bar colours per route: light icons over the dark Home hero / login,
 * dark icons on every light page. Native uses the Capacitor StatusBar plugin;
 * web/PWA updates the theme-color meta.
 */
export async function applyStatusBar(pathname: string): Promise<void> {
  if (typeof window === "undefined") return;
  const dark = isDarkTop(pathname);
  const color = dark ? "#0B2545" : "#F8F7F3";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
  if (!isNative()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  // Style.Dark = light icons (for dark backgrounds); Style.Light = dark icons.
  await StatusBar.setBackgroundColor({ color }).catch(() => undefined);
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
}
