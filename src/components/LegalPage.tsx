import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Languages, Mail, Phone } from "lucide-react";
import { fetchAppInfo, fillPlaceholders, type AppInfo } from "@/lib/app-info";
import { setLanguage } from "@/lib/i18n";
import { ErrorState } from "@/components/catalog/states";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
] as const;

/** Readable public page shell used by /privacy, /terms and /delete-account (works signed-out). */
export function LegalPage({
  title,
  kind,
  children,
}: {
  title: string;
  kind?: "privacy" | "terms";
  children?: (info: AppInfo) => ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => {
    setErr(null);
    fetchAppInfo(true).then(setInfo, (e: Error) => setErr(e.message));
  };
  useEffect(load, []);

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={() => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: "/" }))}
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate font-bold text-primary">{title}</h1>
          <label className="flex items-center gap-1 text-sm">
            <Languages aria-hidden className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">{t("account.language")}</span>
            <select
              value={i18n.language}
              onChange={(e) => setLanguage(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-card px-2"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <article className="mx-auto max-w-2xl px-5 py-6">
        {err ? (
          <ErrorState onRetry={load} />
        ) : !info ? (
          <div className="space-y-3" aria-busy>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${90 - i * 9}%` }} />
            ))}
          </div>
        ) : (
          <>
            {kind && i18n.language !== "en" && (
              <p className="mb-4 rounded-xl bg-secondary/10 p-3 text-sm text-foreground">{t("legal.englishOnly")}</p>
            )}
            {kind && (
              <div className="legal-md">
                <ReactMarkdown>{fillPlaceholders(kind === "privacy" ? info.privacyMd : info.termsMd, info, t("legal.notSet"))}</ReactMarkdown>
              </div>
            )}
            {children?.(info)}
            <SupportBlock info={info} />
          </>
        )}
      </article>
    </main>
  );
}

export function SupportBlock({ info }: { info: AppInfo }) {
  const { t } = useTranslation();
  const phone = info.supportPhone ?? info.supportWhatsapp;
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-4">
      <h2 className="font-bold text-primary">{t("legal.contact")}</h2>
      <p className="mt-1 text-sm">{info.company}</p>
      {info.address && <p className="text-sm text-muted-foreground">{info.address}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Phone className="h-4 w-4" aria-hidden /> {phone}
          </a>
        )}
        {info.supportEmail && (
          <a href={`mailto:${info.supportEmail}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold">
            <Mail className="h-4 w-4" aria-hidden /> {info.supportEmail}
          </a>
        )}
        {!phone && !info.supportEmail && <p className="text-sm text-muted-foreground">{t("legal.askInApp")}</p>}
      </div>
    </section>
  );
}
