import { useCallback, useEffect, useState } from "react";
import { applyLang, LANG_KEY, LANGUAGES, type Lang } from "@/lib/i18n";

/**
 * Loads the saved language from localStorage on mount and returns it along
 * with a setter that persists the choice. Use on every screen outside the
 * language-picker route so translated text renders in the chosen language.
 */
export function useLang() {
  const [lang, setLang] = useState<Lang | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    const value = saved && LANGUAGES.includes(saved as Lang) ? (saved as Lang) : "en";
    applyLang(value);
    setLang(value);
  }, []);

  const choose = useCallback((l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    applyLang(l);
    setLang(l);
  }, []);

  return { lang: lang ?? "en", choose };
}
