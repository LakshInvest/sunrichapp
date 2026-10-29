import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import en from "@/locales/en.json";
import { useLang } from "@/hooks/use-lang";

/** Placeholder shown to signed-in users whose profile has no customer yet. */
export const Route = createFileRoute("/_authenticated/registration")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.register.title },
      { name: "description", content: en.register.comingNext },
      { property: "og:title", content: en.register.title },
      { property: "og:description", content: en.register.comingNext },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Registration,
});

function Registration() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const font = lang === "en" ? "" : "font-deva";

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 ${font}`}>
      <div className="flex flex-col items-center gap-6 animate-in fade-in">
        <Logo />
        <h1 className="text-center text-2xl font-bold text-primary">{t("register.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("register.comingNext")}</p>
      </div>
    </main>
  );
}
