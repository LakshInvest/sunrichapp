import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, Clock, Mail, MessageCircle, MessagesSquare, Phone, type LucideIcon } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useLang } from "@/hooks/use-lang";
import { useAppSettings, waLink } from "@/lib/app-settings";
import { openExternal } from "@/lib/native";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: en.support.metaTitle },
      { name: "description", content: en.support.metaDescription },
      { property: "og:title", content: en.support.metaTitle },
      { property: "og:description", content: en.support.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Support,
});

function Row({ icon: Icon, label, sub, onClick }: { icon: LucideIcon; label: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 px-4 text-left transition active:bg-secondary/5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
        <Icon className="h-5 w-5 text-secondary" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground">{label}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

function Support() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const s = useAppSettings();
  const deva = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-16 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/account" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("support.title")}</h1>
      </header>

      <div className="px-5 pt-5">
        <p className="text-sm text-muted-foreground">{t("support.intro")}</p>
        <section className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {s?.supportPhone && (
            <Row icon={Phone} label={t("support.call")} sub={s.supportPhone} onClick={() => openExternal(`tel:${s.supportPhone}`)} />
          )}
          {s?.supportWhatsapp && (
            <Row
              icon={MessageCircle}
              label={t("support.whatsapp")}
              sub={s.supportWhatsapp}
              onClick={() => openExternal(waLink(s.supportWhatsapp!, t("support.waMessage")))}
            />
          )}
          {s?.supportEmail && (
            <Row icon={Mail} label={t("support.email")} sub={s.supportEmail} onClick={() => openExternal(`mailto:${s.supportEmail}`)} />
          )}
          <Row icon={MessagesSquare} label={t("support.ask")} sub={t("support.askSub")} onClick={() => navigate({ to: "/queries" })} />
        </section>
        {s?.supportHours && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden />
            {t("support.hours", { hours: s.supportHours })}
          </p>
        )}
      </div>
    </main>
  );
}
