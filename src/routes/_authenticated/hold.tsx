import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useLang } from "@/hooks/use-lang";

export const Route = createFileRoute("/_authenticated/hold")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.hold.title },
      { name: "description", content: en.hold.body },
      { property: "og:title", content: en.hold.title },
      { property: "og:description", content: en.hold.body },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Hold,
});

/** Shown when the customer's account has been put on hold. */
function Hold() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const font = lang === "en" ? "" : "font-deva";

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await supabase.rpc("record_logout");
    } catch {
      /* still sign out locally */
    }
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center bg-background px-6 ${font}`}>
      <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-in fade-in">
        <Logo />
        <h1 className="text-center text-2xl font-bold text-primary">{t("hold.title")}</h1>
        <p className="text-center text-sm text-muted-foreground">{t("hold.body")}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-semibold text-foreground shadow-sm transition active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5" />
          {t("account.logout")}
        </button>
      </div>
    </main>
  );
}
