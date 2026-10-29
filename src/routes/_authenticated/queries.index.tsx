import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, MessageCircleQuestion, Plus } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { QueryChip } from "@/components/QueryChip";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useLang } from "@/hooks/use-lang";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

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

  const pull = usePullToRefresh(load);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${lang === "en" ? "" : "font-deva"}`}
      onTouchStart={pull.handlers.onTouchStart}
      onTouchMove={pull.handlers.onTouchMove}
      onTouchEnd={pull.handlers.onTouchEnd}
      onTouchCancel={pull.handlers.onTouchCancel}
    >
      <OfflineBanner />
      {pull.indicator && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center"
          style={{ transform: `translateY(${Math.max(0, pull.offset - 16)}px)` }}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md ${pull.spinning ? "animate-spin" : ""}`}
          >
            <ChevronRight className="h-4 w-4 rotate-90 text-secondary" />
          </span>
        </div>
      )}
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

      <button
        type="button"
        onClick={() => navigate({ to: "/queries/ask", search: { topic: undefined, order: undefined } })}
        className="fixed bottom-20 right-5 z-40 flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/30 transition active:scale-95"
      >
        <Plus className="h-5 w-5" aria-hidden />
        {t("queries.ask.fab")}
      </button>

      <BottomNav />
    </main>
  );
}
