/**
 * Android push (Capacitor). Everything is a no-op on the web. We only ask the
 * system permission after our own "Get order updates?" sheet is accepted.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";
import { isNative } from "@/lib/native";
import i18n from "@/lib/i18n";

const ASKED_KEY = "sunrich.pushAsked"; // "yes" | "no"

export function pushAskState(): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(ASKED_KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}
function setAsk(v: "yes" | "no") {
  try {
    localStorage.setItem(ASKED_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Show our own sheet only on the phone app, once, and never after a "no". */
export function shouldOfferPush(): boolean {
  return isNative() && pushAskState() == null;
}

export function declinePush() {
  setAsk("no");
}

let currentToken: string | null = null;
const APP_VERSION = "1.0.0";

async function saveToken(token: string) {
  currentToken = token;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const lang = (i18n.language || "en").slice(0, 2);
  // New registration (Prompt-74) alongside the existing one; neither blocks the other.
  void supabase.rpc("my_push_token_save", {
    p_token: token,
    p_platform: "android",
    p_lang: ["en", "hi", "mr"].includes(lang) ? lang : "en",
    p_app_version: APP_VERSION,
  });
  await supabase.rpc("save_my_push_token", {
    p_device_id: getDeviceId(),
    p_token: token,
    p_platform: "android",
    p_app: "customer",
    p_language: (i18n.language || "en").slice(0, 2),
  });
}

/** Android channel "orders" (server sends channel_id "orders"). Safe to call often; renames follow the app language. */
export async function ensureOrderChannel(): Promise<void> {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.createChannel({
      id: "orders",
      name: i18n.t("push.channelName"),
      description: i18n.t("push.channelDesc"),
      importance: 4,
      visibility: 1,
      sound: "default",
    });
  } catch {
    /* plugin missing in this build */
  }
}

let listening = false;
// Set just before the native register call and cleared once it answers. If
// the app died mid-register (no google-services.json → Firebase missing), the
// flag survives and we skip push from then on so the app always opens.
const REG_KEY = "sunrich.pushRegistering";
function regFlag(v: boolean | null): boolean {
  try {
    if (v === null) return localStorage.getItem(REG_KEY) === "1";
    if (v) localStorage.setItem(REG_KEY, "1");
    else localStorage.removeItem(REG_KEY);
  } catch {
    /* ignore */
  }
  return false;
}

function openPushUrl(data: unknown) {
  const d = data as Record<string, unknown> | undefined;
  const orderId = d?.["order_id"];
  if (typeof orderId === "string" && /^[0-9a-f-]{36}$/i.test(orderId)) return window.location.assign(`/track/${orderId}`);
  const url = d?.["url"];
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) window.location.assign(url);
}

async function register() {
  if (regFlag(null)) {
    console.warn("[push] skipped: last registration crashed (google-services.json missing?)");
    return;
  }
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await ensureOrderChannel();
  if (!listening) {
    listening = true;
    await PushNotifications.addListener("registration", (t) => {
      regFlag(false);
      void saveToken(t.value);
    });
    await PushNotifications.addListener("registrationError", (e) => {
      regFlag(false);
      console.warn("[push] registration failed, continuing without push", e);
    });
    await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      openPushUrl(a.notification.data);
    });
    // Arrived while the app is open: show our own card at the top; tap opens the screen.
    await PushNotifications.addListener("pushNotificationReceived", (n) => {
      void import("@/components/InAppPush").then(({ showInAppPush }) =>
        showInAppPush({
          title: n.title || i18n.t("push.foregroundTitle"),
          body: n.body || i18n.t("push.foregroundBody"),
          onOpen: () => openPushUrl(n.data),
        }),
      );
    });
  }
  regFlag(true);
  try {
    await PushNotifications.register();
  } catch (e) {
    regFlag(false);
    console.warn("[push] register threw, continuing without push", e);
  }
}

/** User said yes on our sheet → system permission (Android 13+) → token. */
export async function acceptPush(): Promise<boolean> {
  setAsk("yes");
  if (!isNative()) return false;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return false;
    await register();
    return true;
  } catch (e) {
    console.warn("[push] unavailable in this build", e);
    return false;
  }
}

/** Re-save the token on login / language change — only if already granted. */
export async function refreshPushToken(): Promise<void> {
  if (!isNative() || pushAskState() !== "yes") return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") await register();
  } catch {
    /* plugin missing in this build */
  }
}

/** Called before sign-out and when the Account switch is turned off. */
export async function removePushToken(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await supabase.rpc("my_push_token_remove", { p_token: token });
  } catch {
    /* sign out anyway */
  }
}

/** Account switch: remembered on the device. */
export function pushSwitchOn(): boolean {
  return pushAskState() === "yes";
}

/** Switch ON → reason sheet → Android ask → register → my_push_token_save. "denied" means only Settings can fix it. */
export async function enablePush(): Promise<"on" | "denied" | "cancelled"> {
  if (!isNative()) return "denied";
  const { checkPermission } = await import("@/lib/permissions");
  let p = await checkPermission("notifications");
  if (p === "prompt") {
    const { askReason } = await import("@/components/PermissionReason");
    if (!(await askReason("notifications"))) return "cancelled";
    const { PushNotifications } = await import("@capacitor/push-notifications");
    try {
      p = (await PushNotifications.requestPermissions()).receive === "granted" ? "granted" : "denied";
    } catch {
      p = "denied";
    }
    await checkPermission("notifications");
  }
  if (p !== "granted") return "denied";
  setAsk("yes");
  await register();
  return "on";
}

/** Switch OFF → my_push_token_remove; stays off across restarts. */
export async function disablePush(): Promise<void> {
  setAsk("no");
  await removePushToken();
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
  } catch {
    /* ignore */
  }
}
