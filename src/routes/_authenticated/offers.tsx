import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import en from "@/locales/en.json";
import { PageShell } from "@/components/PageShell";
import { OffersList } from "@/components/SchemeOffers";
import { useLang } from "@/hooks/use-lang";
import { fetchCatalogue, readCatalogueCache, type CatalogData } from "@/lib/catalogue";

export const Route = createFileRoute("/_authenticated/offers")({
  head: () => ({
    meta: [
      { title: en.quote.offersMetaTitle },
      { name: "description", content: en.quote.offersMetaDescription },
      { property: "og:title", content: en.quote.offersMetaTitle },
      { property: "og:description", content: en.quote.offersMetaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Offers,
});

function Offers() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState<CatalogData | null>(() => readCatalogueCache());
  useEffect(() => { void fetchCatalogue().then(setData).catch(() => undefined); }, []);
  return (
    <PageShell className={lang === "en" ? "" : "font-deva"}>
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/95 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : void navigate({ to: "/account" }))} aria-label={t("registration.back")} className="flex h-11 w-11 items-center justify-center rounded-xl active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-bold text-primary">{t("quote.offers")}</h1>
      </header>
      <div className="px-5 pb-10 pt-2"><OffersList products={data?.products ?? []} /></div>
    </PageShell>
  );
}
