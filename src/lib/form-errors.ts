/** Scrolls to and focuses the first visible field error (elements marked data-field-error). Browser-only. */
export function scrollToFirstError(): void {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>("[data-field-error]");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = el.closest("label, [data-field]")?.querySelector<HTMLElement>("input, textarea, select, button");
    field?.focus({ preventScroll: true });
  });
}

/** Exact server message from a Supabase/PostgREST or thrown error, or the fallback. */
export function serverMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = String((e as { message: unknown }).message ?? "").trim();
    if (m) return m;
  }
  return fallback;
}
