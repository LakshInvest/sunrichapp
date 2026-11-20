import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "@tanstack/react-router";
import { Download, Share2, X } from "lucide-react";
import en from "@/locales/en.json";
import { billPdfUrl } from "@/lib/order-extras";
import { openExternal, shareLink } from "@/lib/native";
import { serverMessage } from "@/lib/form-errors";

const PdfPages = lazy(() => import("@/components/bill/PdfPages"));

export const Route = createFileRoute("/_authenticated/bill")({
  head: () => ({
    meta: [
      { title: en.billView.title + " · Sunrich" },
      { name: "description", content: en.billView.loading },
      { property: "og:title", content: en.billView.title + " · Sunrich" },
      { property: "og:description", content: en.billView.loading },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { path: string; no?: string; order?: string } => ({
    path: typeof s["path"] === "string" ? s["path"] : "",
    ...(typeof s["no"] === "string" ? { no: s["no"] } : {}),
    ...(typeof s["order"] === "string" ? { order: s["order"] } : {}),
  }),
  component: BillViewer,
});

/** In-app bill viewer for the Android app (Prompt-77 §6). */
function BillViewer() {
  const { path, no, order } = Route.useSearch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    billPdfUrl(path).then((u) => (u ? setUrl(u) : setErr(t("billView.error"))), (e) => setErr(serverMessage(e, t("billView.error"))));
  }, [path, t]);
  const onError = useCallback(() => setErr(t("billView.error")), [t]);
  const close = () => {
    if (order) void navigate({ to: "/track/$id", params: { id: order }, replace: true });
    else window.history.back();
  };
  return (
    <div className="flex min-h-[var(--app-h,100dvh)] flex-col bg-muted">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-background px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-sm">
        <p className="min-w-0 flex-1 truncate pl-2 text-base font-bold text-primary">{t("billView.title")} {no ?? ""}</p>
        <button type="button" onClick={close} aria-label={t("billView.close")} className="flex h-11 w-11 items-center justify-center rounded-xl active:scale-95"><X className="h-5 w-5" /></button>
      </header>
      <main className="flex-1 px-3 py-3">
        {err ? <p role="alert" className="rounded-xl bg-card p-4 text-sm text-destructive">{err}</p>
          : url ? <ClientOnly fallback={null}><Suspense fallback={<div className="h-[70vh] animate-pulse rounded-lg bg-card" />}><PdfPages url={url} onError={onError} /></Suspense></ClientOnly>
          : <p className="p-4 text-center text-sm text-muted-foreground">{t("billView.loading")}</p>}
      </main>
      <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_-6px_rgb(11_37_69/0.2)]">
        <button type="button" disabled={!url} onClick={() => url && void shareLink({ title: `${t("billView.title")} ${no ?? ""}`, url })} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border text-base font-bold text-foreground disabled:opacity-50"><Share2 className="h-4 w-4" />{t("billView.share")}</button>
        {/* TODO(next Android build): save to phone with @capacitor/filesystem instead of the system browser. */}
        <button type="button" disabled={!url} onClick={() => url && openExternal(url)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4" />{t("billView.download")}</button>
      </div>
    </div>
  );
}
