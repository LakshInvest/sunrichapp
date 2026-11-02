/**
 * Keyboard-safe layout: mirrors the visual viewport into CSS variables so
 * screens can size themselves to the space above the on-screen keyboard.
 *   --app-h : visible height (px), falls back to 100dvh in CSS
 *   --kb    : keyboard overlap at the bottom (px)
 * Also scrolls the focused field into view once the keyboard has opened.
 */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
}

export function installViewportVars(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const root = document.documentElement;
  const vv = window.visualViewport;
  const apply = () => {
    const h = vv ? vv.height : window.innerHeight;
    const kb = vv ? keyboardInset(window.innerHeight, vv.height, vv.offsetTop) : 0;
    root.style.setProperty("--app-h", `${Math.round(h)}px`);
    root.style.setProperty("--kb", `${kb}px`);
    root.toggleAttribute("data-kb-open", kb > 120);
  };
  apply();
  vv?.addEventListener("resize", apply);
  vv?.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);

  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el || !el.matches?.("input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea, select")) return;
    // Wait for the keyboard animation, then bring the field into view.
    window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 320);
  };
  document.addEventListener("focusin", onFocus);
  return () => {
    vv?.removeEventListener("resize", apply);
    vv?.removeEventListener("scroll", apply);
    window.removeEventListener("resize", apply);
    document.removeEventListener("focusin", onFocus);
  };
}
