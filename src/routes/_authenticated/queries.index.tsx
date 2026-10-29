import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, MessageCircleQuestion } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
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
  const [rows, setRows] = useState<Summary[] | null>(null);

  const load = useCallback(async () => {
    const { data: qs, error } = await supabase
      .from("customer_queries")
      .select("id, subject, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      setRows([]);
      return;
    }
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
    <main className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${lang === "en" ? "" : "font-deva"}`}>
      <h1 className="text-3xl font-bold text-primary">{t("queries.title")}</h1>

      {rows === null && <p className="mt-10 text-center text-sm text-muted-foreground">{t("registration.loading")}</p>}

      {rows !== null && rows.length === 0 && (
        <div className="mt-14 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <MessageCircleQuestion className="h-8 w-8 text-secondary" aria-hidden />
          </span>
          <p className="mt-4 text-lg font-semibold text-foreground">{t("queries.emptyTitle")}</p>
          <p className="mt-1 max-w-64 text-sm text-muted-foreground">{t("queries.emptyBody")}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {(rows ?? []).map((q) => (
          <Link
            key={q.id}
            to="/queries/$id"
            params={{ id: q.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition active:scale-[0.99]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-bold text-foreground">{q.subject}</p>
                <QueryChip status={q.status} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {q.preview ?? timeLabel(q.updatedAt, lang)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{timeLabel(q.updatedAt, lang)}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
