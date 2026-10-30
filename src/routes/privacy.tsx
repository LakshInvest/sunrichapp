import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Sunrich" },
      { name: "description", content: "How the Sunrich app collects, uses and protects your information." },
      { property: "og:title", content: "Privacy Policy — Sunrich" },
      { property: "og:description", content: "How the Sunrich app collects, uses and protects your information." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { t } = useTranslation();
  return <LegalPage title={t("legal.privacy")} kind="privacy" />;
}
