import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLastMobile } from "@/lib/device";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import en from "@/locales/en.json";
import { LANG_KEY, LANGUAGES, applyLang, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: en.metaTitle },
      { name: "description", content: en.metaDescription },
      { property: "og:title", content: en.metaTitle },
      { property: "og:description", content: en.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LABELS: Record<Lang, string> = { en: "English", hi: "हिंदी", mr: "मराठी" };

function Index() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && LANGUAGES.includes(saved)) {
      applyLang(saved);
      // Returning customer: go straight to "Welcome back" PIN.
      if (getLastMobile()) {
        void navigate({ to: "/auth", replace: true });
        return;
      }
      setLang(saved);
    } else setLang(null);
  }, []);

  const choose = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    applyLang(l);
    setLang(l);
  };

  if (lang === undefined) return <main className="min-h-screen bg-background" />;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10">
      {lang === null ? (
        <div className="flex flex-1 flex-col justify-center gap-10 animate-in fade-in">
          <div className="flex justify-center"><Logo /></div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">{t("chooseLanguage")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("chooseLanguageHint")}</p>
          </div>
          <div className="flex flex-col gap-4">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                lang={l}
                onClick={() => choose(l)}
                className={`min-h-16 rounded-xl border-2 border-border bg-card text-xl font-semibold text-primary shadow-sm transition active:scale-[0.98] hover:border-secondary ${l === "en" ? "" : "font-deva"}`}
              >
                {LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`flex flex-1 flex-col animate-in fade-in ${lang === "en" ? "" : "font-deva"}`}>
          <div className="flex items-center justify-between">
            <Logo size="md" />
            <button
              onClick={() => { localStorage.removeItem(LANG_KEY); setLang(null); }}
              className="min-h-11 rounded-xl px-3 text-sm font-medium text-secondary"
            >
              {t("changeLanguage")}
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="h-1 w-12 rounded-full bg-accent" />
            <h1 className="text-4xl font-bold leading-tight text-primary">{t("welcomeTitle")}</h1>
            <p className="text-lg text-muted-foreground">{t("welcomeSubtitle")}</p>
          </div>
          <Link
            to="/auth"
            className="flex min-h-14 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md active:scale-[0.98]"
          >
            {t("getStarted")}
          </Link>
        </div>
      )}
    </main>
  );
}
