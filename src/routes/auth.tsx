import { AppLoader } from "@/components/AppLoader";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { OfflineBanner } from "@/components/OfflineBanner";
import en from "@/locales/en.json";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import {
  sendOtp,
  verifyOtp,
  pinLogin,
  getMyDevice,
  type OtpResult,
  type PinLoginResult,
} from "@/lib/otp.functions";
import { getMyRegistration } from "@/lib/registration.functions";
import {
  getDeviceId,
  getDeviceLabel,
  getLastMobile,
  setLastMobile,
  clearLastMobile,
  maskMobile,
  savedDeviceIds,
} from "@/lib/device";

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
    // While an OTP/PIN login is mid-flight (Set PIN screen pending) the session
    // already exists — don't bounce the user out of the flow they're in.
    if (sessionStorage.getItem(AUTH_FLOW_KEY)) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const reg = await getMyRegistration();
      if (!reg.customerId || reg.status === "draft" || reg.status === "rejected") {
        throw redirect({ to: "/registration" });
      }
      throw redirect({ to: reg.status === "blocked" ? "/hold" : "/home" });
    }
  },
  component: Login,
  pendingComponent: AppLoader,
  pendingMs: 0,
});

const RESEND_SECONDS = 30;
/** Present while an OTP/PIN login is in progress; keeps the /auth beforeLoad redirect out of the flow. */
const AUTH_FLOW_KEY = "sunrich.authflow";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

type Step = "welcome" | "mobile" | "code" | "setpin";

/** Four large PIN boxes with auto-advance, paste support and auto-submit. */
function PinBoxes({
  value,
  onChange,
  onComplete,
  disabled,
  shake,
  autoFocusFirst,
  label,
  checking,
  success,
}: {
  checking?: boolean;
  success?: boolean;
  value: string[];
  onChange: (v: string[]) => void;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  shake?: boolean;
  autoFocusFirst?: boolean;
  label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const fill = (start: number, raw: string) => {
    const next = [...value];
    const chars = raw.replace(/\D/g, "").slice(0, 4 - start).split("");
    chars.forEach((c, i) => (next[start + i] = c));
    if (!chars.length) next[start] = "";
    onChange(next);
    refs.current[Math.min(start + chars.length, 3)]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      const next = [...value];
      next[i - 1] = "";
      onChange(next);
      refs.current[i - 1]?.focus();
    }
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData("text"));
  };

  return (
    <div
      className={`flex justify-center gap-3 ${shake ? "animate-shake" : ""}`}
      role="group"
      aria-label={label}
    >
      {value.map((d, i) => (
        <input
          style={checking ? { animationDelay: `${i * 0.12}s` } : undefined}
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? 4 : 1}
          value={d}
          disabled={disabled}
          autoFocus={autoFocusFirst && i === 0}
          aria-label={`${label} ${i + 1}`}
          onChange={(e) => fill(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-14 rounded-2xl border bg-card text-center text-3xl font-bold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60 ${success ? "border-success text-success" : "border-input text-primary"} ${checking ? "animate-pin-wave" : ""}`}
        />
      ))}
    </div>
  );
}

function Login() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const send = useServerFn(sendOtp);
  const verify = useServerFn(verifyOtp);
  const pinCheck = useServerFn(pinLogin);
  const deviceStatus = useServerFn(getMyDevice);
  const myCustomer = useServerFn(getMyRegistration);
  const offline = useOffline();

  const [step, setStep] = useState<Step>("mobile");
  const [deviceId, setDeviceId] = useState("");
  const [lastMobile, setLastMobileState] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [pin, setPin] = useState<string[]>(Array(4).fill(""));
  const [confirm, setConfirm] = useState<string[]>(Array(4).fill(""));
  const [pinPhase, setPinPhase] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [forcePin, setForcePin] = useState(false);
  const [pinOk, setPinOk] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const valid = /^[6-9]\d{9}$/.test(mobile);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    console.info("[sunrich] device id", id);
    const saved = getLastMobile();
    if (saved) {
      setLastMobileState(saved);
      setStep("welcome");
    }
  }, []);

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

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const errText = (r: Extract<OtpResult, { ok: false }>) =>
    r.code === "provider" && r.message
      ? r.message
      : t(`auth.errors.${r.code}`, { seconds: r.seconds, left: r.left, defaultValue: t("auth.errors.generic") });

  /** Home when registration is done, registration placeholder when it isn't. */
  const routeAfterLogin = async () => {
    sessionStorage.removeItem(AUTH_FLOW_KEY);
    const reg = await myCustomer();
    if (!reg.customerId || reg.status === "draft" || reg.status === "rejected") {
      await navigate({ to: "/registration" });
      return;
    }
    await navigate({ to: reg.status === "blocked" ? "/hold" : "/home" });
  };

  const requestOtp = async () => {
    setError(null);
    setNotice(null);
    if (offline) {
      setError(t("offline.hint"));
      return;
    }
    setBusy(true);
    try {
      const r = await send({ data: { mobile } });
      if (!r.ok) {
        setError(errText(r));
        if (r.code === "wait" && r.seconds && step === "code") setCountdown(r.seconds);
        return;
      }
      setDigits(Array(6).fill(""));
      toast.success(t("auth.otpSentToast", { mobile: `+91 ••••• ${mobile.slice(-4)}` }));
      setStep("code");
      setCountdown(RESEND_SECONDS);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const goSetPin = () => {
    setPin(Array(4).fill(""));
    setConfirm(Array(4).fill(""));
    setPinPhase("enter");
    setStep("setpin");
  };

  const afterOtpSession = async (serverTrusted: boolean | undefined) => {
    // The session row must exist before Set PIN: set_my_pin validates it.
    const { error: rlErr } = await supabase.rpc("record_login", {
      p_user_agent: navigator.userAgent.slice(0, 500),
      p_login_method: "otp_whatsapp",
    });
    if (rlErr) {
      setError(rlErr.message);
      return;
    }
    if (setLastMobile(mobile)) setLastMobileState(mobile);
    if (forcePin) return goSetPin();
    let trusted = serverTrusted;
    if (trusted === undefined) {
      try {
        trusted = (await deviceStatus({ data: { deviceId } })).trusted;
      } catch {
        trusted = false; // play safe and ask for the PIN now
      }
    }
    if (!trusted) return goSetPin();
    await routeAfterLogin();
  };

  const submitCode = async (code: string) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await verify({ data: { mobile, code, deviceId } });
      if (!r.ok || !r.tokenHash) {
        setError(r.ok ? t("auth.errors.generic") : errText(r));
        setDigits(Array(6).fill(""));
        boxes.current[0]?.focus();
        return;
      }
      sessionStorage.setItem(AUTH_FLOW_KEY, "1");
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
      if (vErr) {
        setError(t("auth.errors.generic"));
        return;
      }
      await afterOtpSession(r.trusted);
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

  const submitPinLogin = async (pinValue: string) => {
    const m = lastMobile;
    if (!m || !deviceId || busy) return;
    if (offline) {
      setError(t("offline.hint"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r: PinLoginResult = await pinCheck({ data: { mobile: m, deviceId, pin: pinValue } });
      if (!r.ok) {
        if (r.status === "wrong_pin") {
          setError(t("auth.pin.wrongTries", { n: r.triesLeft ?? 0 }));
          shake();
        } else if (r.status === "not_registered") {
          clearLastMobile();
          setLastMobileState(null);
          setMobile("");
          setForcePin(false);
          setStep("mobile");
        } else if (r.status === "device_not_trusted") {
          console.warn("[sunrich] device_not_trusted", { sent: deviceId, saved: savedDeviceIds() });
          setNotice(t("auth.pin.deviceNotRecognised"));
          setMobile(m);
          setForcePin(false);
          setStep("mobile");
        } else {
          setNotice(t("auth.pin.useOtp"));
          setMobile(m);
          setForcePin(r.status === "pin_not_set" || r.status === "locked_use_otp");
          setStep("mobile");
        }
        return;
      }
      sessionStorage.setItem(AUTH_FLOW_KEY, "1");
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
      if (vErr) {
        setError(t("auth.errors.generic"));
        return;
      }
      const { error: rlErr } = await supabase.rpc("record_login", {
        p_user_agent: navigator.userAgent.slice(0, 500),
        p_login_method: "pin",
      });
      if (rlErr) {
        setError(rlErr.message);
        return;
      }
      setLastMobile(m);
      setPinOk(true);
      await new Promise((res) => setTimeout(res, 450));
      await routeAfterLogin();
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const onPinEntered = (entered: string) => {
    setPin(entered.split(""));
    setPinPhase("confirm");
  };

  const submitSetPin = async (confirmed: string) => {
    const entered = pin.join("");
    if (!confirmed) return;
    if (entered !== confirmed) {
      setError(t("auth.pin.mismatch"));
      shake();
      setConfirm(Array(4).fill(""));
      return;
    }
    if (!deviceId || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: pErr } = await supabase.rpc("set_my_pin", {
        p_pin: confirmed,
        p_device_id: deviceId,
        p_device_label: getDeviceLabel(),
      });
      if (pErr) {
        setError(pErr.message);
        shake();
        setPin(Array(4).fill(""));
        setConfirm(Array(4).fill(""));
        setPinPhase("enter");
        return;
      }
      // Read back the trusted device row: only continue when it exists.
      const { data: me } = await supabase.auth.getUser();
      const { data: dev } = await supabase
        .from("user_devices")
        .select("id")
        .eq("user_id", me.user?.id ?? "")
        .eq("device_id", deviceId)
        .is("revoked_at", null)
        .maybeSingle();
      if (!dev) {
        setError(t("auth.pin.notSaved"));
        shake();
        setPin(Array(4).fill(""));
        setConfirm(Array(4).fill(""));
        setPinPhase("enter");
        return;
      }
      setForcePin(false);
      await routeAfterLogin();
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const pretty = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  const font = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10 ${font}`}>
      <OfflineBanner />
      <div className="flex flex-1 flex-col justify-center gap-10 animate-in fade-in">
        <div className="flex justify-center">
          <Logo />
        </div>

        {step === "welcome" && lastMobile && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-center text-2xl font-bold text-primary">{t("auth.pin.welcomeTitle")}</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">{maskMobile(lastMobile)}</p>
            </div>
            {notice && (
              <p role="status" className="rounded-xl bg-secondary/10 px-4 py-3 text-center text-sm font-medium text-primary">
                {notice}
              </p>
            )}
            <PinBoxes
              value={pin}
              onChange={setPin}
              onComplete={(p) => void submitPinLogin(p)}
              disabled={busy || pinOk}
              shake={shaking}
              checking={busy && !pinOk}
              success={pinOk}
              label={t("auth.pin.group")}
            />
            {pinOk && (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success" role="status">
                <Check className="h-5 w-5" /> {t("auth.pin.success")}
              </p>
            )}
            {busy && !pinOk && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.pin.checking")}
              </p>
            )}
            {error && <p role="alert" className="text-center text-sm font-medium text-destructive">{error}</p>}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setError(null);
                  setMobile(lastMobile);
                  setForcePin(true);
                  setStep("mobile");
                }}
                className="min-h-11 text-sm font-medium text-secondary underline underline-offset-4"
              >
                {t("auth.pin.forgotPin")}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLastMobile();
                  setLastMobileState(null);
                  setMobile("");
                  setForcePin(false);
                  setNotice(null);
                  setError(null);
                  setStep("mobile");
                }}
                className="min-h-11 text-sm font-medium text-muted-foreground underline underline-offset-4"
              >
                {t("auth.pin.differentNumber")}
              </button>
            </div>
          </div>
        )}

        {step === "mobile" && (
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
              disabled={!valid || busy || offline}
              title={offline ? t("offline.hint") : undefined}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <WhatsAppIcon />}
              {busy ? t("auth.sending") : t("auth.getOtp")}
            </button>
          </form>
        )}

        {step === "code" && (
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
              disabled={countdown > 0 || busy || offline}
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

        {step === "setpin" && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-center text-2xl font-bold text-primary">
                {pinPhase === "enter" ? t("auth.pin.setPinTitle") : t("auth.pin.confirmTitle")}
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {pinPhase === "enter" ? t("auth.pin.setPinSubtitle") : t("auth.pin.confirmSubtitle")}
              </p>
            </div>
            {pinPhase === "enter" ? (
              <div className="flex flex-col gap-3">
                <p className="text-center text-sm font-medium text-foreground">{t("auth.pin.enterRow")}</p>
                <PinBoxes
                  value={pin}
                  onChange={setPin}
                  onComplete={onPinEntered}
                  disabled={busy}
                  shake={shaking}
                  label={t("auth.pin.group")}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-center text-sm font-medium text-foreground">{t("auth.pin.enterRow")}</p>
                <PinBoxes
                  value={pin}
                  onChange={() => {}}
                  onComplete={() => {}}
                  disabled
                  label={t("auth.pin.group")}
                />
                <p className="mt-4 text-center text-sm font-medium text-foreground">{t("auth.pin.confirmRow")}</p>
                <PinBoxes
                  value={confirm}
                  onChange={setConfirm}
                  onComplete={(c) => void submitSetPin(c)}
                  disabled={busy}
                  shake={shaking}
                  autoFocusFirst
                  label={t("auth.pin.group")}
                />
              </div>
            )}
            {busy && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.pin.setting")}
              </p>
            )}
            {error && <p role="alert" className="text-center text-sm font-medium text-destructive">{error}</p>}
            {pinPhase === "confirm" && !busy && (
              <button
                type="button"
                onClick={() => {
                  setPinPhase("enter");
                  setConfirm(Array(4).fill(""));
                  setError(null);
                }}
                className="min-h-11 text-sm font-medium text-muted-foreground underline underline-offset-4"
              >
                {t("auth.pin.reenter")}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
