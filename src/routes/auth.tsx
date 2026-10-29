import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import en from "@/locales/en.json";
import { useLang } from "@/hooks/use-lang";
import { sendOtp, verifyOtp, type OtpResult } from "@/lib/otp.functions";

export const LOGGED_OUT_FLAG = "sunrich.loggedOut";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.auth.metaTitle },
      { name: "description", content: en.auth.metaDescription },
      { property: "og:title", content: en.auth.metaTitle },
      { property: "og:description", content: en.auth.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
  },
  component: Login,
});

const RESEND_SECONDS = 30;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

function Login() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const send = useServerFn(sendOtp);
  const verify = useServerFn(verifyOtp);

  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const valid = /^[6-9]\d{9}$/.test(mobile);

  useEffect(() => {
    if (sessionStorage.getItem(LOGGED_OUT_FLAG)) {
      sessionStorage.removeItem(LOGGED_OUT_FLAG);
      setNotice(t("auth.loggedOut"));
    }
  }, [t]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const errText = (r: Extract<OtpResult, { ok: false }>) =>
    r.code === "provider" && r.message
      ? r.message
      : t(`auth.errors.${r.code}`, { seconds: r.seconds, left: r.left, defaultValue: t("auth.errors.generic") });

  const requestOtp = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const r = await send({ data: { mobile } });
      if (!r.ok) {
        setError(errText(r));
        if (r.code === "wait" && r.seconds && step === "code") setCountdown(r.seconds);
        return;
      }
      setDigits(Array(6).fill(""));
      setStep("code");
      setCountdown(RESEND_SECONDS);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (code: string) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await verify({ data: { mobile, code } });
      if (!r.ok || !r.tokenHash) {
        setError(r.ok ? t("auth.errors.generic") : errText(r));
        setDigits(Array(6).fill(""));
        boxes.current[0]?.focus();
        return;
      }
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
      if (vErr) {
        setError(t("auth.errors.generic"));
        return;
      }
      await supabase.rpc("record_login", { p_user_agent: navigator.userAgent.slice(0, 500) });
      await navigate({ to: "/home" });
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const fill = (start: number, value: string) => {
    const next = [...digits];
    const chars = value.replace(/\D/g, "").slice(0, 6 - start).split("");
    chars.forEach((c, i) => (next[start + i] = c));
    if (!chars.length) next[start] = "";
    setDigits(next);
    const focusAt = Math.min(start + chars.length, 5);
    boxes.current[focusAt]?.focus();
    const code = next.join("");
    if (code.length === 6 && next.every(Boolean)) void submitCode(code);
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      boxes.current[i - 1]?.focus();
    }
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData("text"));
  };

  const onMobileSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) void requestOtp();
  };

  const pretty = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  const font = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10 ${font}`}>
      <div className="flex flex-1 flex-col justify-center gap-10 animate-in fade-in">
        <div className="flex justify-center">
          <Logo />
        </div>

        {step === "mobile" ? (
          <form onSubmit={onMobileSubmit} className="flex flex-col gap-5" noValidate>
            <div>
              <h1 className="text-center text-2xl font-bold text-primary">{t("auth.title")}</h1>
              <p className="mt-1 text-center text-sm text-muted-foreground">{t("auth.subtitle")}</p>
            </div>
            {notice && (
              <p role="status" className="rounded-xl bg-secondary/10 px-4 py-3 text-center text-sm font-medium text-primary">
                {notice}
              </p>
            )}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">{t("auth.mobileLabel")}</span>
              <div className="flex min-h-14 items-center rounded-xl border border-input bg-card transition focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/30">
                <span className="border-r border-border px-4 text-base font-semibold text-foreground">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setError(null);
                  }}
                  placeholder={t("auth.mobilePlaceholder")}
                  aria-invalid={!!error}
                  className="h-14 flex-1 bg-transparent px-4 text-lg tracking-wider text-foreground outline-none"
                />
              </div>
            </label>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={!valid || busy}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <WhatsAppIcon />}
              {busy ? t("auth.sending") : t("auth.getOtp")}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-center text-2xl font-bold text-primary">{t("auth.codeTitle")}</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t("auth.codeSent", { mobile: pretty })}
              </p>
            </div>
            <div className="flex justify-between gap-2" role="group" aria-label={t("auth.codeTitle")}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxes.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={i === 0 ? 6 : 1}
                  value={d}
                  disabled={busy}
                  aria-label={t("auth.digit", { n: i + 1 })}
                  onChange={(e) => fill(i, e.target.value)}
                  onKeyDown={(e) => onKey(i, e)}
                  onPaste={(e) => onPaste(i, e)}
                  onFocus={(e) => e.target.select()}
                  className="h-14 w-12 rounded-xl border border-input bg-card text-center text-2xl font-bold text-primary outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60"
                />
              ))}
            </div>
            {busy && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.verifying")}
              </p>
            )}
            {error && <p role="alert" className="text-center text-sm font-medium text-destructive">{error}</p>}
            <button
              type="button"
              disabled={countdown > 0 || busy}
              onClick={() => void requestOtp()}
              className="min-h-11 text-base font-semibold text-secondary disabled:text-muted-foreground"
            >
              {countdown > 0 ? t("auth.resendIn", { seconds: countdown }) : t("auth.resend")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("mobile");
                setError(null);
                setDigits(Array(6).fill(""));
              }}
              className="min-h-11 text-sm font-medium text-muted-foreground underline underline-offset-4"
            >
              {t("auth.changeNumber")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
