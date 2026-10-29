import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import en from "@/locales/en.json";
import { useLang } from "@/hooks/use-lang";
import { LANGUAGES, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.auth.metaTitle },
      { name: "description", content: en.auth.metaDescription },
      { property: "og:title", content: en.auth.metaTitle },
      { property: "og:description", content: en.auth.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    // Already signed in? Skip the login form.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: "/home" });
    }
  },
  component: Login,
});

const EMAIL_MAX = 255;
const PASSWORD_MAX = 128;

function Login() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("auth.enterEmail"));
      return;
    }
    if (!password) {
      setError(t("auth.enterPassword"));
      return;
    }
    if (trimmedEmail.length > EMAIL_MAX || password.length > PASSWORD_MAX) {
      setError(t("auth.loginFailed"));
      return;
    }

    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setBusy(false);

    if (authError) {
      const invalid =
        authError.status === 400 &&
        /invalid login credentials/i.test(authError.message);
      setError(t(invalid ? "auth.wrongPassword" : "auth.loginFailed"));
      return;
    }

    await navigate({ to: "/home" });
  };

  return (
    <main
      className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10 ${lang === "en" ? "" : "font-deva"}`}
    >
      <div className="flex flex-1 flex-col justify-center gap-10 animate-in fade-in">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div>
          <h1 className="text-center text-2xl font-bold text-primary">
            {t("auth.title")}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {t("auth.subtitle")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              {t("auth.emailLabel")}
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="min-h-12 rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              {t("auth.passwordLabel")}
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="min-h-14 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? t("auth.loggingIn") : t("auth.loginButton")}
          </button>
        </form>
      </div>
    </main>
  );
}
