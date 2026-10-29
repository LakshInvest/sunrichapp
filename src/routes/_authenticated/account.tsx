import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { useLang } from "@/hooks/use-lang";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { getMyRegistration, type DbLocalized, type RegistrationDto } from "@/lib/registration.functions";

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

function pl(v: DbLocalized | null | undefined, lang: string): string {
  if (!v) return "";
  if (lang === "hi") return v.hi || v.en;
  if (lang === "mr") return v.mr || v.en;
  return v.en;
}

function Account() {
  const { t } = useTranslation();
  const { lang, choose } = useLang();
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const [profile, setProfile] = useState<{ name: string; mobile: string } | null>(null);
  const [customer, setCustomer] = useState<RegistrationDto | null>(null);
  const myReg = useServerFn(getMyRegistration);

  useEffect(() => {
    let active = true;
    void myReg().then((reg) => {
      if (active && reg.customerId) setCustomer(reg);
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("user_profiles")
        .select("full_name, mobile")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!active) return;
      const m = (p?.mobile ?? "").replace(/\D/g, "").slice(-10);
      setProfile({
        name: p?.full_name ?? "",
        mobile: m ? `+91 ${m.slice(0, 5)} ${m.slice(5)}` : "",
      });
    });
    return () => {
      active = false;
    };
  }, []);

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
    <main
      className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${lang === "en" ? "" : "font-deva"}`}
    >
      <h1 className="text-3xl font-bold text-primary">{t("account.title")}</h1>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">{t("account.signedInAs")}</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{profile?.name || "…"}</p>
        <p className="mt-1 text-base text-muted-foreground">
          <span className="sr-only">{t("account.mobile")}: </span>
          {profile?.mobile || "…"}
        </p>
      </section>

      {customer && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{t("account.customerCode")}</p>
            <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
              {t(`status.${customer.status ?? "draft"}`)}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold text-foreground">{customer.customerCode ?? "—"}</p>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{t("account.customerType")}: </span>
              {pl(customer.typeName, lang)}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{t("account.address")}: </span>
              {[customer.addressLine1, customer.addressLine2, customer.landmark, customer.city, customer.pincode]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
        </section>
      )}

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
