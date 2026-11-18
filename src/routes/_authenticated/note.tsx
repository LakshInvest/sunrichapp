import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { fetchMyNote, reportPdf } from "@/lib/reports";
import { formatINR } from "@/lib/catalogue";
import { deliverStatement } from "@/lib/statement-delivery";
import { uploadStatement } from "@/lib/statement.functions";
import { serverMessage } from "@/lib/form-errors";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { indDate } from "@/lib/order-format";
const noteQuery = (number: string) => queryOptions({ queryKey: ["khata", "note", number], queryFn: () => fetchMyNote(number) });
export const Route = createFileRoute("/_authenticated/note")({
  validateSearch: (search) => z.object({ number: z.string().optional() }).parse(search),
  loaderDeps: ({ search }) => ({ number: search.number ?? "" }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(noteQuery(deps.number)),
  head: () => ({ meta: [{ title: "Credit / debit note — Sunrich" }, { name: "description", content: "Your Sunrich account adjustment and document." }, { property: "og:title", content: "Credit / debit note — Sunrich" }, { property: "og:description", content: "Your Sunrich account adjustment and document." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Note,
});
function Note() {
  const { number } = Route.useSearch(); const { data: note } = useSuspenseQuery(noteQuery(number ?? ""));
  const { t } = useTranslation(); const { lang } = useLang(); const navigate = useNavigate(); const offline = useOffline(); const upload = useServerFn(uploadStatement);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const title = t(note?.note_type === "credit" ? "reports.credits" : "reports.debits");
  const download = async () => {
    if (!note || busy || offline) return; setBusy(true); setError(null);
    try { const blob = await reportPdf(`${t("brand")} · ${title}`, note.note_no, [`${t("khata.stmt.date")}: ${indDate(note.note_date, lang)}`, `${t("reports.reason")}: ${note.reason}`, `${t("reports.value")}: ${formatINR(Number(note.total))}`]); await deliverStatement(blob, `Sunrich-note-${note.id}.pdf`, `${title} ${note.note_no}`, "download", upload); }
    catch (e) { setError(serverMessage(e, t("khata.stmt.failed"))); } finally { setBusy(false); }
  };
  return <PageShell className={`px-5 pb-8 ${lang === "en" ? "" : "font-deva"}`}><header className="flex items-center gap-2 pt-3"><Button variant="ghost" size="icon" aria-label={t("registration.back")} onClick={() => navigate({ to: "/khata" })}><ArrowLeft /></Button><h1 className="text-xl font-bold">{title}</h1></header>{note ? <div className="mt-6"><p className="break-words font-bold text-primary">{note.note_no}</p><p className="mt-2 text-sm text-muted-foreground">{indDate(note.note_date, lang)}</p><p className={`my-6 text-3xl font-bold ${note.note_type === "credit" ? "text-success" : "text-destructive"}`}>{formatINR(Number(note.total))}</p><h2 className="text-sm font-semibold">{t("reports.reason")}</h2><p className="mt-2 break-words text-sm">{note.reason}</p>{note.invoice_id && <Button variant="outline" className="mt-6" onClick={() => navigate({ to: "/invoice/$id", params: { id: note.invoice_id ?? "" } })}>{t("orders2.invoice")}</Button>}<Button className="mt-6 min-h-12 w-full" disabled={busy || offline} onClick={() => void download()}>{busy ? <Loader2 className="animate-spin" /> : <Download />}{t("khata.stmt.download")}</Button></div> : <p className="py-8 text-sm">{t("reports.noteMissing")}</p>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</PageShell>;
}