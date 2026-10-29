import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import mr from "@/locales/mr.json";

export const LANG_KEY = "sunrich.lang";
export const LANGUAGES = ["en", "hi", "mr"] as const;
export type Lang = (typeof LANGUAGES)[number];

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export function applyLang(lang: Lang) {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
