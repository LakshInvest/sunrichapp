import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { useLang } from "@/hooks/use-lang";
import { LANGUAGES, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: en.account.metaTitle },
      { name: "description", content: en.account.metaDescription },
      { property: "og:title", content: en.account.metaTitle },
      { property: "og:description", content: en.account.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

const LANGUAGE_LABELS: Record<Lang, string> = { en: "English", hi: "हिंदी", mr: "मराठी" };

function Account() {
  const { t } = useTranslation();
  const { lang, choose } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    await navigate.context.queryClient.cancelQueries();
    navigate.context.queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${lang === "en" ? "" : "font-deva"}`}
    >
      <h1 className="text-3xl font-bold text-primary">{t("account.title")}</h1>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">{t("account.signedInAs")}</p>
        <p className="mt-1 break-all text-base font-medium text-foreground">
          {email ?? "…"}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-foreground">{t("account.language")}</p>
        <div className="mt-3 flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              onClick={() => choose(l)}
              aria-pressed={lang === l}
              className={`min-h-12 flex-1 rounded-xl border-2 text-base font-semibold transition active:scale-[0.98] ${
                lang === l
                  ? "border-secondary bg-secondary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-lg font-semibold text-destructive shadow-sm transition active:scale-[0.98]"
      >
        <LogOut className="h-5 w-5" />
        {t("account.logout")}
      </button>

      <BottomNav />
    </main>
  );
}
