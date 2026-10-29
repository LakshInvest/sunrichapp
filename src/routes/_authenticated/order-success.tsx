import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { formatINR } from "@/lib/catalogue";
import { useLang } from "@/hooks/use-lang";

export const Route = createFileRoute("/_authenticated/order-success")({
  head: () => ({
    meta: [
      { title: en.success.metaTitle },
      { name: "description", content: en.success.metaDescription },
      { property: "og:title", content: en.success.metaTitle },
      { property: "og:description", content: en.success.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderSuccess,
});

type Part = {
  order_id: string;
  order_no: string;
  status: string;
  grand_total: number;
  fulfilled_by: string;
};

function statusWord(status: string, t: (k: string) => string): string {
  if (status === "approved") return t("success.statusConfirmed");
  if (status === "credit_hold") return t("success.statusUnderReview");
  return t("success.statusReceived");
}

function OrderSuccess() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const deva = lang === "en" ? "" : "font-deva";

  const [parts, setParts] = useState<Part[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sunrich.lastOrder");
      if (raw) {
        const parsed = JSON.parse(raw) as { parts: Part[]; deliveryDate: string; slot: string };
        setParts(parsed.parts ?? []);
        setDeliveryDate(parsed.deliveryDate ?? "");
        setSlot(parsed.slot ?? "");
      }
    } catch {
      /* show the calm empty state */
    }
  }, []);

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-5 pb-10 ${deva}`}>
      <OfflineBanner />
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        {/* Soft check animation */}
        <svg viewBox="0 0 96 96" className="h-24 w-24" role="img" aria-label={t("success.title")}>
          <circle
            className="animate-check-ring"
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#2EA3C7"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="264"
            strokeDashoffset="264"
          />
          <path
            className="animate-check-mark"
            d="M32 50 L44 62 L66 38"
            fill="none"
            stroke="#0B2545"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset="60"
          />
        </svg>

        <h1 className="mt-6 text-2xl font-bold text-primary">{t("success.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("success.subtitle")}</p>

        {deliveryDate && (
          <p className="mt-4 rounded-xl bg-secondary/10 px-4 py-2 text-sm font-semibold text-primary">
            {t("success.expected", { date: deliveryDate, slot })}
          </p>
        )}

        <ul className="mt-6 w-full space-y-3">
          {parts.map((p) => (
            <li key={p.order_id} className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-foreground">{p.order_no}</p>
                <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {statusWord(p.status, t)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {t("success.deliveredBy", {
                    who: p.fulfilled_by === "distributor" ? t("success.byDistributor") : t("success.bySunrich"),
                  })}
                </span>
                <span className="font-bold text-primary">{formatINR(p.grand_total)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/track/$id", params: { id: parts[0]?.order_id ?? "" } })}
          disabled={parts.length === 0}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md shadow-primary/20 transition active:scale-[0.98] disabled:opacity-50"
        >
          {t("success.trackOrder")}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-lg font-semibold text-foreground transition active:scale-[0.98]"
        >
          <Check className="h-5 w-5 text-secondary" aria-hidden />
          {t("success.continueShopping")}
        </button>
      </div>
    </main>
  );
}
