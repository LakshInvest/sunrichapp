/**
 * Keyboard-safe layout. Exactly ONE thing resizes the page when the keyboard
 * opens: the Android window (adjustResize) in the app, the browser itself on
 * the web. This file never resizes anything — it only publishes the visible
 * size and keeps the focused field visible:
 *   --app-h : visible height (px), falls back to 100dvh in CSS
 *   --kb    : keyboard overlap the layout still has to avoid (px; 0 when the
 *             window was already resized)
 */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
}

/** How far to scroll so `field` sits above a bottom bar of `barTop` with a gap. */
export function revealDelta(fieldTop: number, fieldBottom: number, viewTop: number, barTop: number, gap = 12): number {
  if (fieldBottom + gap > barTop) return Math.round(fieldBottom + gap - barTop);
  if (fieldTop - gap < viewTop) return Math.round(fieldTop - gap - viewTop);
  return 0;
}

const FIELD = "input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea, select";

export function installViewportVars(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const root = document.documentElement;
  const vv = window.visualViewport;
  let raf = 0;
  const apply = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const h = vv ? vv.height : window.innerHeight;
      const kb = vv ? keyboardInset(window.innerHeight, vv.height, vv.offsetTop) : 0;
      root.style.setProperty("--app-h", `${Math.round(h)}px`);
      root.style.setProperty("--kb", `${kb}px`);
      reveal();
    });
  };

  // Keep the focused field just above any fixed bottom bar (Submit) — a
  // minimal instant scroll, never a "center" jump that can blank the screen.
  const reveal = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || !el.matches?.(FIELD)) return;
    const viewTop = vv ? vv.offsetTop : 0;
    const viewBottom = viewTop + (vv ? vv.height : window.innerHeight);
    let barTop = viewBottom;
    document.querySelectorAll<HTMLElement>("[data-kb-bar]").forEach((b) => {
      const t = b.getBoundingClientRect().top;
      if (t > viewTop && t < barTop) barTop = t;
    });
    const r = el.getBoundingClientRect();
    const d = revealDelta(r.top, r.bottom, viewTop, barTop);
    if (!d) return;
    const scroller = el.closest<HTMLElement>("[data-scroll-area]");
    if (scroller) scroller.scrollBy({ top: d });
    else window.scrollBy({ top: d });
  };

  apply();
  vv?.addEventListener("resize", apply);
  window.addEventListener("resize", apply);

  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el?.matches?.(FIELD)) return;
    // The resize event reveals it when the keyboard opens; this covers moving
    // between fields while the keyboard is already open.
    window.setTimeout(reveal, 60);
  };
  document.addEventListener("focusin", onFocus);
  return () => {
    cancelAnimationFrame(raf);
    vv?.removeEventListener("resize", apply);
    window.removeEventListener("resize", apply);
    document.removeEventListener("focusin", onFocus);
  };
}
