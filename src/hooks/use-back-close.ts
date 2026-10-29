import { useCallback, useEffect } from "react";

/**
 * Closes a sheet/dialog with the browser/Android back button.
 * Pushes a history entry while it is open; popping that entry closes the
 * sheet instead of leaving the page, and closing normally removes the entry.
 */
export function useBackClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    history.pushState({ sunrichSheet: Date.now() }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (history.state?.sunrichSheet) history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Call instead of the plain onClose when the user closes the sheet itself. */
  const dismiss = useCallback(() => {
    if (open && history.state?.sunrichSheet) history.back();
    else onClose();
  }, [open, onClose]);

  return dismiss;
}
