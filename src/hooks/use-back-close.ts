import { useCallback, useEffect, useRef } from "react";

/**
 * Closes a sheet/dialog with the browser/Android back button.
 * Each open sheet pushes one history entry onto a shared stack; a back press
 * closes only the top-most sheet, so stacked sheets (e.g. the location
 * explanation over the address form) don't close together.
 */
type Entry = { close: () => void };
const stack: Entry[] = [];
let skip = 0;
let listening = false;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (skip > 0) {
      skip--;
      return;
    }
    stack.pop()?.close();
  });
}

export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    ensureListener();
    const entry: Entry = { close: () => closeRef.current() };
    history.pushState({ sunrichSheet: Date.now() }, "");
    stack.push(entry);
    return () => {
      const i = stack.indexOf(entry);
      if (i === -1) return; // already closed by a back press
      stack.splice(i, 1);
      if (history.state?.sunrichSheet) {
        skip++;
        history.back();
      }
    };
  }, [open]);

  /** Call instead of the plain onClose when the user closes the sheet itself. */
  const dismiss = useCallback(() => {
    if (open && history.state?.sunrichSheet && stack[stack.length - 1]) history.back();
    else onClose();
  }, [open, onClose]);

  return dismiss;
}
