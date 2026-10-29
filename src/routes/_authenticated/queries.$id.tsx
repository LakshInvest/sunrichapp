import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileText, Paperclip, Send, TriangleAlert, X } from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { QueryChip } from "@/components/QueryChip";
import { useLang } from "@/hooks/use-lang";
import { prepareUpload } from "@/lib/image-compress";
import { getMyRegistration } from "@/lib/registration.functions";
import { getStaffNames } from "@/lib/query-staff.functions";

export const Route = createFileRoute("/_authenticated/queries/$id")({
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
  component: Thread,
});

type Msg = {
  id: string;
  senderType: string;
  senderId: string | null;
  body: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  createdAt: string;
};

function isImage(name: string | null): boolean {
  return !!name && /\.(jpe?g|png|webp|gif)$/i.test(name);
}

function timeLabel(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StaffAvatar() {
  return (
    <span aria-hidden className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15">
      <svg viewBox="0 0 24 32" className="h-4 w-3.5">
        <path d="M12 1C12 1 2 13 2 20a10 10 0 0 0 20 0C22 13 12 1 12 1Z" className="fill-secondary" />
      </svg>
    </span>
  );
}

function Message({
  m,
  url,
  lang,
  staffName,
  onOpenImage,
}: {
  m: Msg;
  url: string | null;
  lang: string;
  staffName?: string;
  onOpenImage: (url: string) => void;
}) {
  const { t } = useTranslation();
  const staff = m.senderType === "staff";
  const [failed, setFailed] = useState(false);
  const image = isImage(m.attachmentName) || isImage(m.attachmentPath);
  const broken = !url || failed;
  return (
    <div className={`flex items-start gap-2 ${staff ? "" : "flex-row-reverse"}`}>
      {staff && <StaffAvatar />}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[15px] shadow-sm ${
          staff
            ? "rounded-tl-sm border border-border bg-card text-foreground"
            : "rounded-tr-sm bg-primary text-primary-foreground"
        }`}
      >
        {staff && (
          <p className="mb-0.5 text-[11px] font-bold text-secondary">
            {t("queries.staffLabel", { name: staffName || "Sunrich" })}
          </p>
        )}
        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
        {m.attachmentPath && url && image && !failed && (
          <button
            type="button"
            onClick={() => onOpenImage(url)}
            aria-label={m.attachmentName ?? t("queries.attach")}
            className={m.body ? "mt-2 block" : "block"}
          >
            <img
              src={url}
              alt={m.attachmentName ?? ""}
              onError={() => setFailed(true)}
              className="max-h-56 w-48 rounded-xl object-cover"
            />
          </button>
        )}
        {m.attachmentPath && (!image || broken) && (
          <a
            href={url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className={`mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
              staff ? "bg-secondary/10 text-secondary" : "bg-primary-foreground/15 text-primary-foreground"
            }`}
          >
            {broken ? <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> : <FileText className="h-4 w-4 shrink-0" aria-hidden />}
            <span className="truncate">{m.attachmentName ?? t("queries.attach")}</span>
            {broken && <span className="sr-only">{t("queries.attachFailed")}</span>}
          </a>
        )}
        <p className={`mt-1 text-[11px] ${staff ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
          {timeLabel(m.createdAt, lang)}
        </p>
      </div>
    </div>
  );
}

function Thread() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const myReg = useServerFn(getMyRegistration);
  const staffNames = useServerFn(getStaffNames);
  const [query, setQuery] = useState<{ subject: string; status: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data: q } = await supabase
      .from("customer_queries")
      .select("id, subject, status")
      .eq("id", id)
      .maybeSingle();
    if (!q) {
      setMissing(true);
      return;
    }
    setQuery({ subject: q.subject, status: q.status });
    const { data: msgs } = await supabase
      .from("customer_query_messages")
      .select("id, sender_type, body, attachment_path, attachment_name, created_at")
      .eq("query_id", id)
      .order("created_at", { ascending: true });
    const list: Msg[] = (msgs ?? []).map((m) => ({
      id: m.id,
      senderType: m.sender_type,
      body: m.body,
      attachmentPath: m.attachment_path,
      attachmentName: m.attachment_name,
      createdAt: m.created_at,
    }));
    setMessages(list);
    const entries = await Promise.all(
      list
        .filter((m) => m.attachmentPath)
        .map(async (m) => {
          const { data } = await supabase.storage
            .from("customer-docs")
            .createSignedUrl(m.attachmentPath as string, 600);
          return [m.id, data?.signedUrl ?? null] as const;
        }),
    );
    setUrls(Object.fromEntries(entries.filter(([, u]) => u !== null) as [string, string][]));
  }, [id]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    let active = true;
    void myReg().then((reg) => {
      if (active) setCustomerId(reg.customerId);
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const closed = query?.status === "closed";
  const canAttach = query?.status === "open";

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setFile(f);
  };

  const send = async () => {
    const message = text.trim();
    if ((!message && !file) || sending) return;
    setSending(true);
    try {
      let path: string | null = null;
      let name: string | null = null;
      if (file) {
        if (!customerId) throw new Error("no customer");
        const prepared = await prepareUpload(file);
        if (!prepared.ok) {
          toast.error(t(prepared.reason === "tooLarge" ? "registration.errFileTooLarge" : "registration.errFileType"));
          setSending(false);
          return;
        }
        const safe = file.name.replace(/[^\w.-]+/g, "-");
        path = `${customerId}/queries/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("customer-docs")
          .upload(path, prepared.blob, { contentType: prepared.mime });
        if (upErr) throw upErr;
        name = file.name;
      }
      const rpcArgs: {
        p_query_id: string;
        p_message?: string;
        p_attachment_path?: string;
        p_attachment_name?: string;
      } = { p_query_id: id };
      if (message) rpcArgs.p_message = message;
      if (path) {
        rpcArgs.p_attachment_path = path;
        rpcArgs.p_attachment_name = name ?? "";
      }
      const { error: rpcErr } = await supabase.rpc("reply_query", rpcArgs);
      if (rpcErr) throw rpcErr;
      setText("");
      setFile(null);
      await load();
    } catch {
      toast.error(t("queries.errSend"));
    }
    setSending(false);
  };

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background ${lang === "en" ? "" : "font-deva"}`}>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/queries" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">
          {query?.subject ?? t("queries.title")}
        </p>
        {query && <QueryChip status={query.status} className="mr-2" />}
      </header>

      <div className="flex-1 px-4 py-4">
        {missing && <p className="mt-10 text-center text-sm text-muted-foreground">{t("queries.notFound")}</p>}
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <Message key={m.id} m={m} url={urls[m.id] ?? null} lang={lang} />
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-md">
        {closed ? (
          <p className="py-2 text-center text-sm font-medium text-muted-foreground">{t("queries.closedNote")}</p>
        ) : (
          <>
            {file && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-secondary/10 px-3 py-2 text-sm text-foreground">
                <span className="min-w-0 flex-1 truncate">{t("queries.attached", { name: file.name })}</span>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                disabled={!canAttach || sending}
                title={canAttach ? t("queries.camera") : t("queries.attachLocked")}
                aria-label={t("queries.camera")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition active:scale-95 disabled:opacity-40"
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={!canAttach || sending}
                title={canAttach ? t("queries.chooseFile") : t("queries.attachLocked")}
                aria-label={t("queries.chooseFile")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition active:scale-95 disabled:opacity-40"
              >
                <Paperclip className="h-5 w-5" aria-hidden />
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("queries.replyPlaceholder")}
                aria-label={t("queries.replyPlaceholder")}
                className="min-h-11 flex-1 rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || (!text.trim() && !file)}
                aria-label={t("queries.send")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition active:scale-95 disabled:opacity-40"
              >
                <Send className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </>
        )}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={pick} />
      </div>
    </main>
  );
}
