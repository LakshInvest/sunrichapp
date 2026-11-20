import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LegalPage } from "@/components/LegalPage";
import { serverMessage } from "@/lib/form-errors";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — Sunrich" },
      { name: "description", content: "Ask Sunrich to delete your account and personal details, from the web or inside the app." },
      { property: "og:title", content: "Delete your account — Sunrich" },
      { property: "og:description", content: "Ask Sunrich to delete your account and personal details, from the web or inside the app." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccount,
});

function DeleteAccount() {
  const { t } = useTranslation();
  const [mobile, setMobile] = useState("");
  const [reason, setReason] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) return setErr(t("legal.mobileErr"));
    if (!ok || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase.rpc("public_request_account_deletion", reason.trim() ? { p_mobile: mobile, p_reason: reason.trim() } : { p_mobile: mobile });
      if (error) throw error;
      const m = (data as { message?: string } | null)?.message;
      setMsg(typeof m === "string" && m ? m : t("legal.sent"));
    } catch (e2) {
      setErr(serverMessage(e2, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LegalPage title={t("legal.deleteTitle")}>
      {() => (
        <div className="space-y-6 text-[15px] leading-relaxed">
          {msg ? (
            <p role="status" className="rounded-xl bg-secondary/10 p-4 font-medium text-foreground">{msg}</p>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-4 rounded-xl border border-border bg-card p-4">
              <p>{t("legal.webIntro")}</p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{t("legal.mobile")}</span>
                <input
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(-10))}
                  placeholder="98765 43210"
                  className="min-h-12 rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-secondary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{t("legal.reason")}</span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 300))}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:border-secondary"
                />
              </label>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
                <span className="text-sm">{t("legal.understand")}</span>
              </label>
              {err && <p role="alert" className="text-sm font-medium text-destructive">{err}</p>}
              <button
                type="submit"
                disabled={!ok || busy}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-destructive font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {busy ? t("account.saving") : t("legal.send")}
              </button>
            </form>
          )}
          <section>
            <h2 className="font-bold text-primary">{t("legal.inAppTitle")}</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t("legal.deleteStep1")}</li>
              <li>{t("legal.deleteStep2")}</li>
              <li>{t("legal.deleteStep3")}</li>
            </ol>
          </section>
        </div>
      )}
    </LegalPage>
  );
}
