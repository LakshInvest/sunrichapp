import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, LogOut } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { getMyRegistration } from "@/lib/registration.functions";
import { Logo } from "@/components/Logo";
import { SupportBlock } from "@/components/LegalPage";
import { Button } from "@/components/ui/button";
import { fetchAppInfo, type AppInfo } from "@/lib/app-info";
import { useLang } from "@/hooks/use-lang";

export const Route = createFileRoute("/_authenticated/under-review")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.underReview.title },
      { name: "description", content: en.underReview.body },
      { property: "og:title", content: en.underReview.title },
      { property: "og:description", content: en.underReview.body },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getMyRegistration(),
  component: UnderReview,
});

/** Full-screen status shown while an admin reviews the registration. */
function UnderReview() {
  const reg = Route.useLoaderData();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const font = lang === "en" ? "" : "font-deva";

  useEffect(() => {
    let active = true;
    fetchAppInfo().then((i) => active && setInfo(i), () => undefined);
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
    <main className={`flex min-h-dvh flex-col items-center justify-center bg-background px-6 ${font}`}>
      <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-in fade-in">
        <Logo />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <Clock className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-center text-2xl font-bold text-primary">{t("underReview.title")}</h1>
        <p className="text-center text-sm text-muted-foreground">{t("underReview.body")}</p>
        <dl className="w-full space-y-3 border-y border-border py-4 text-sm">
          {[
            [t("registration.stepType"), reg.typeName ? (lang === "hi" ? reg.typeName.hi : lang === "mr" ? reg.typeName.mr : reg.typeName.en) || reg.typeName.en : null],
            [t("registration.businessName"), reg.businessName],
            [t("registration.contactName"), reg.contactName],
            [t("registration.mobile"), reg.mobile],
            [t("registration.address1"), [reg.addressLine1, reg.addressLine2, reg.city, reg.state, reg.pincode].filter(Boolean).join(", ")],
          ].filter(([, value]) => !!value).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium text-foreground">{value}</dd></div>)}
        </dl>
        {info && (
          <div className="w-full text-left">
            <SupportBlock info={info} />
            {(info.supportWhatsapp || info.supportPhone) && <Button asChild variant="outline" className="mt-3 min-h-11 w-full"><a href={`https://wa.me/${(info.supportWhatsapp || info.supportPhone || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{t("support.whatsapp")}</a></Button>}
          </div>
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-semibold text-foreground shadow-sm transition active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          {t("account.logout")}
        </button>
      </div>
    </main>
  );
}
