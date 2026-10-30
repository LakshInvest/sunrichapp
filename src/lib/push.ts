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
async function register() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  if (!listening) {
    listening = true;
    await PushNotifications.addListener("registration", (t) => void saveToken(t.value));
    await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      const url = (a.notification.data as Record<string, string> | undefined)?.["url"];
      if (url && url.startsWith("/")) window.location.assign(url);
    });
  }
  await PushNotifications.register();
}

/** User said yes on our sheet → system permission (Android 13+) → token. */
export async function acceptPush(): Promise<boolean> {
  setAsk("yes");
  if (!isNative()) return false;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return false;
  await register();
  return true;
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
