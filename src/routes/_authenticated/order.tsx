import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PackageOpen } from "lucide-react";
import en from "@/locales/en.json";
import { BottomNav } from "@/components/BottomNav";
import { useLang } from "@/hooks/use-lang";

export const Route = createFileRoute("/_authenticated/order")({
  head: () => ({
    meta: [
      { title: en.order.metaTitle },
      { name: "description", content: en.order.metaDescription },
      { property: "og:title", content: en.order.metaTitle },
      { property: "og:description", content: en.order.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Order,
});

function Order() {
  const { t } = useTranslation();
  const { lang } = useLang();
  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${lang === "en" ? "" : "font-deva"}`}
    >
      <h1 className="text-3xl font-bold text-primary">{t("order.title")}</h1>
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 text-center shadow-sm">
        <PackageOpen className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        <p className="px-6 text-muted-foreground">{t("order.comingSoon")}</p>
      </div>
      <BottomNav />
    </main>
  );
}
