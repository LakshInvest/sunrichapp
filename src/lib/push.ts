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

async function saveToken(token: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase.rpc("save_my_push_token", {
    p_device_id: getDeviceId(),
    p_token: token,
    p_platform: "android",
    p_app: "customer",
    p_language: (i18n.language || "en").slice(0, 2),
  });
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

async function register() {
  if (regFlag(null)) {
    console.warn("[push] skipped: last registration crashed (google-services.json missing?)");
    return;
  }
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.createChannel({
    id: "orders",
    name: "Orders",
    description: "Order, delivery and payment updates",
    importance: 4,
    visibility: 1,
  }).catch(() => undefined);
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
      const url = (a.notification.data as Record<string, string> | undefined)?.["url"];
      if (url && url.startsWith("/")) window.location.assign(url);
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
