import { ownCustomerFilter } from "@/lib/my-customer";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, MessageCircle, MessageCircleQuestion, Phone, Plus } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { isPriceRequestSubject } from "@/lib/price-request";
import { ErrorState } from "@/components/catalog/states";
import { useAppSettings, waLink } from "@/lib/app-settings";
import { openExternal } from "@/lib/native";
import { QueryChip } from "@/components/QueryChip";
import { useLang } from "@/hooks/use-lang";

export const Route = createFileRoute("/_authenticated/queries/")({
  head: () => ({
    meta: [
      { title: en.queries.metaTitle },
      { name: "description", content: en.queries.metaDescription },
      { property: "og:title", content: en.queries.metaTitle },
      { property: "og:description", content: en.queries.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QueriesList,
});

type Summary = {
  id: string;
  subject: string;
  status: string;
  preview: string | null;
  updatedAt: string;
};

function timeLabel(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function QueriesList() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Summary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const settings = useAppSettings();

  const load = useCallback(async () => {
    const { data: qs, error } = await supabase
      .from("customer_queries")
      .select("id, subject, status, created_at, updated_at")
      .eq("customer_id", await ownCustomerFilter())
      .order("created_at", { ascending: false });
    if (error) {
      setFailed(true);
      setRows((r) => r ?? []);
      return;
    }
    setFailed(false);
    const list = qs ?? [];
    const ids = list.map((q) => q.id);
    const previews = new Map<string, string>();
    if (ids.length > 0) {
      const { data: msgs } = await supabase
        .from("customer_query_messages")
        .select("query_id, body, attachment_name")
        .in("query_id", ids)
        .order("created_at", { ascending: false });
      for (const m of msgs ?? []) {
        if (!previews.has(m.query_id)) previews.set(m.query_id, m.body || m.attachment_name || "");
      }
    }
    setRows(
      list.map((q) => ({
        id: q.id,
        subject: q.subject,
        status: q.status,
        preview: previews.get(q.id) || null,
        updatedAt: q.updated_at,
      })),
    );
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <PageShell className={`pb-[calc(6rem+env(safe-area-inset-bottom))] ${lang === "en" ? "" : "font-deva"}`} onRefresh={load}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : void navigate({ to: "/account" }))}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-foreground">{t("support.title")}</h1>
      </header>

      <div className="px-5 pt-4">
        {(settings?.supportPhone || settings?.supportWhatsapp) && (
          <div className="grid grid-cols-2 gap-3" data-testid="support-contact">
            {settings?.supportPhone && (
              <button
                type="button"
                onClick={() => openExternal(`tel:${settings.supportPhone}`)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-primary shadow-sm transition active:scale-[0.98]"
              >
                <Phone className="h-4 w-4 text-secondary" aria-hidden />
                {t("support.call")}
              </button>
            )}
            {settings?.supportWhatsapp && (
              <button
                type="button"
                onClick={() => openExternal(waLink(settings.supportWhatsapp!, t("support.waMessage")))}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-primary shadow-sm transition active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4 text-success" aria-hidden />
                {t("support.whatsapp")}
              </button>
            )}
          </div>
        )}

        <h2 className="mt-5 text-base font-bold text-foreground">{t("queries.title")}</h2>

        {rows === null && <p className="mt-10 text-center text-sm text-muted-foreground">{t("registration.loading")}</p>}

        {failed && rows !== null && rows.length === 0 && <ErrorState message={t("errors.generic")} onRetry={() => void load()} />}

        {!failed && rows !== null && rows.length === 0 && (
          <div className="mt-10 flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <MessageCircleQuestion className="h-8 w-8 text-secondary" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-semibold text-foreground">{t("queries.emptyTitle")}</p>
            <p className="mt-1 max-w-64 text-sm text-muted-foreground">{t("queries.emptyBody")}</p>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3">
          {(rows ?? []).map((q) => (
            <Link
              key={q.id}
              to="/queries/$id"
              params={{ id: q.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-[15px] font-bold text-foreground">{q.subject}</p>
                  {isPriceRequestSubject(q.subject) && (
                    <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-bold text-secondary">
                      {t("queries.priceRequestTag")}
                    </span>
                  )}
                  <QueryChip status={q.status} />
                </div>
                {q.preview && <p className="mt-0.5 truncate text-sm text-muted-foreground">{q.preview}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{timeLabel(q.updatedAt, lang)}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/queries/ask", search: { topic: undefined, order: undefined, subject: undefined, message: undefined, product: undefined } })}
          className="mx-auto flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-md transition active:scale-[0.98]"
          data-testid="ask-question"
        >
          <Plus className="h-5 w-5" aria-hidden />
          {t("queries.ask.fab")}
        </button>
      </div>
    </PageShell>
  );
}
