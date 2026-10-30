import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Sunrich" },
      { name: "description", content: "The terms that apply when you order through the Sunrich app." },
      { property: "og:title", content: "Terms of Use — Sunrich" },
      { property: "og:description", content: "The terms that apply when you order through the Sunrich app." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  const { t } = useTranslation();
  return <LegalPage title={t("legal.terms")} kind="terms" />;
}
