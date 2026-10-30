import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — Sunrich" },
      { name: "description", content: "How to delete your Sunrich account and data, in the app or by contacting support." },
      { property: "og:title", content: "Delete your account — Sunrich" },
      { property: "og:description", content: "How to delete your Sunrich account and data, in the app or by contacting support." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccount,
});

function DeleteAccount() {
  const { t } = useTranslation();
  return (
    <LegalPage title={t("legal.deleteTitle")}>
      {() => (
        <div className="space-y-4 text-[15px] leading-relaxed">
          <p>{t("legal.deleteIntro")}</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t("legal.deleteStep1")}</li>
            <li>{t("legal.deleteStep2")}</li>
            <li>{t("legal.deleteStep3")}</li>
            <li>{t("legal.deleteStep4")}</li>
          </ol>
          <p className="text-muted-foreground">{t("legal.deleteKept")}</p>
        </div>
      )}
    </LegalPage>
  );
}
