import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileText, Paperclip, Send, X } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { prepareUpload } from "@/lib/image-compress";
import { getMyRegistration } from "@/lib/registration.functions";

export const Route = createFileRoute("/_authenticated/queries/ask")({
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
  component: AskQuery,
});

const TOPICS = [
  { context: "general", key: "queries.ask.topicGeneral" },
  { context: "order", key: "queries.ask.topicOrder" },
  { context: "payment", key: "queries.ask.topicPayment" },
] as const;

function AskQuery() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const myReg = useServerFn(getMyRegistration);

  const [context, setContext] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  void myReg().then((reg) => setCustomerId(reg.customerId));

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setFile(f);
  };

  const send = async () => {
    const subj = subject.trim();
    const body = message.trim();
    if (!subj || !body || sending || offline) return;
    setSending(true);
    setError(null);
    let attachmentPath: string | undefined;
    let attachmentName: string | undefined;
    try {
      if (file && customerId) {
        const prepared = await prepareUpload(file);
        if (!prepared.ok) {
          toast.error(t(prepared.reason === "tooLarge" ? "registration.errFileTooLarge" : "registration.errFileType"));
          setSending(false);
          return;
        }
        const safe = file.name.replace(/[^\w.-]+/g, "-");
        attachmentPath = `${customerId}/queries/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("customer-docs")
          .upload(attachmentPath, prepared.blob, { contentType: prepared.mime });
        if (upErr) {
          // Storage only allows attachments while the query is open — send
          // the question anyway and tell the user exactly why.
          setError(upErr.message);
          attachmentPath = undefined;
        } else {
          attachmentName = file.name;
        }
      }
      const rpcArgs: Record<string, string> = {
        p_subject: subj,
        p_message: body,
        p_context: context,
      };
      if (attachmentPath) rpcArgs["p_attachment_path"] = attachmentPath;
      if (attachmentName) rpcArgs["p_attachment_name"] = attachmentName;
      const { data: queryId, error: rpcErr } = await supabase.rpc("customer_raise_query", rpcArgs);
      if (rpcErr) throw new Error(rpcErr.message);
      toast.success(t("queries.ask.sent"));
      await navigate({ to: "/queries/$id", params: { id: String(queryId) } });
    } catch (e) {
      setError((e as Error).message || t("queries.errSend"));
    } finally {
      setSending(false);
    }
  };

  const deva = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/queries" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("queries.ask.title")}</p>
      </header>

      <div className="flex-1 px-5 pb-10 pt-5">
        <p className="text-sm font-medium text-foreground">{t("queries.ask.topicLabel")}</p>
        <div className="mt-2 flex gap-2" role="group" aria-label={t("queries.ask.topicLabel")}>
          {TOPICS.map((topic) => (
            <button
              key={topic.context}
              type="button"
              onClick={() => setContext(topic.context)}
              aria-pressed={context === topic.context}
              className={`min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 ${
                context === topic.context
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {t(topic.key)}
            </button>
          ))}
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("queries.ask.subjectLabel")}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder={t("queries.ask.subjectPlaceholder")}
            className="min-h-12 rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("queries.ask.messageLabel")}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder={t("queries.ask.messagePlaceholder")}
            className="rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
        </label>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            disabled={offline}
            aria-label={t("queries.camera")}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition active:scale-95 disabled:opacity-50"
          >
            <Camera className="h-4 w-4 text-secondary" aria-hidden />
            {t("queries.camera")}
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={offline}
            aria-label={t("queries.chooseFile")}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition active:scale-95 disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4 text-secondary" aria-hidden />
            {t("queries.chooseFile")}
          </button>
        </div>
        {file && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/10 px-3 py-2 text-sm text-foreground">
            <FileText className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label={t("queries.remove")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t("queries.ask.attachHint")}</p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || offline || !subject.trim() || !message.trim()}
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          <Send className="h-5 w-5" aria-hidden />
          {sending ? t("queries.sending") : t("queries.ask.sendQuestion")}
        </button>
        {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={pick} />
    </main>
  );
}
