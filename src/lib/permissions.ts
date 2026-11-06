import { isNative, openAppSettings } from "@/lib/native";

export type PermissionKind = "notifications" | "location" | "camera";
/** granted / prompt (can ask) / denied (only Settings can fix) / unavailable (not on this device). */
export type PermissionAnswer = "granted" | "prompt" | "denied" | "unavailable";

/** Device-level, never cleared on logout. */
export const PERMISSION_KEY = "sunrich.permissions.v1";

type Saved = { seen: boolean; answers: Partial<Record<PermissionKind, PermissionAnswer>> };
const KINDS: PermissionKind[] = ["notifications", "location", "camera"];
const VALID: PermissionAnswer[] = ["granted", "prompt", "denied", "unavailable"];
let memory: Saved = { seen: false, answers: {} };

export function readPermissions(): Saved {
  try {
    const raw = localStorage.getItem(PERMISSION_KEY);
    if (!raw) return memory;
    const p = JSON.parse(raw) as Partial<Saved>;
    const answers: Saved["answers"] = {};
    for (const k of KINDS) {
      const v = p?.answers?.[k];
      if (v && VALID.includes(v)) answers[k] = v;
    }
    return { seen: p?.seen === true, answers };
  } catch {
    return memory;
  }
}

function save(v: Saved) {
  memory = v;
  try {
    localStorage.setItem(PERMISSION_KEY, JSON.stringify(v));
  } catch {
    /* in-memory only this session */
  }
}

export function markPermissionsSeen() {
  save({ ...readPermissions(), seen: true });
}

/** Show the one-time "Sunrich ko ye chahiye" screen only until it was answered once. */
export function shouldShowPermissionsIntro(): boolean {
  return !readPermissions().seen;
}

export function remember(kind: PermissionKind, answer: PermissionAnswer): PermissionAnswer {
  const s = readPermissions();
  save({ ...s, answers: { ...s.answers, [kind]: answer } });
  return answer;
}

const norm = (v: string | undefined): PermissionAnswer => (v === "granted" || v === "denied" ? v : "prompt");

export async function checkPermission(kind: PermissionKind): Promise<PermissionAnswer> {
  try {
    if (isNative()) {
      if (kind === "notifications") {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        return remember(kind, norm((await PushNotifications.checkPermissions()).receive));
      }
      if (kind === "camera") {
        const { Camera } = await import("@capacitor/camera");
        return remember(kind, norm((await Camera.checkPermissions()).camera));
      }
      const { Geolocation } = await import("@capacitor/geolocation");
      const p = await Geolocation.checkPermissions();
      return remember(kind, p.location === "granted" || p.coarseLocation === "granted" ? "granted" : norm(p.location));
    }
    if (kind === "camera") return "unavailable"; // web uses the file picker
    if (kind === "notifications") {
      if (typeof Notification === "undefined") return "unavailable";
      return remember(kind, Notification.permission === "default" ? "prompt" : Notification.permission);
    }
    if (!navigator.geolocation) return "unavailable";
    if (!navigator.permissions) return "prompt";
    return remember(kind, norm((await navigator.permissions.query({ name: "geolocation" })).state));
  } catch {
    return "unavailable";
  }
}

export async function requestPermission(kind: PermissionKind): Promise<PermissionAnswer> {
  const now = await checkPermission(kind);
  if (now !== "prompt") return now;
  try {
    if (kind === "notifications") {
      if (isNative()) {
        const { acceptPush } = await import("@/lib/push");
        await acceptPush();
        return checkPermission(kind);
      }
      const v = await Notification.requestPermission();
      return remember(kind, v === "default" ? "prompt" : v);
    }
    if (kind === "camera") {
      const { Camera } = await import("@capacitor/camera");
      return remember(kind, norm((await Camera.requestPermissions({ permissions: ["camera"] })).camera));
    }
    if (isNative()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const v = await Geolocation.requestPermissions();
      return remember(kind, v.location === "granted" || v.coarseLocation === "granted" ? "granted" : norm(v.location));
    }
    return await new Promise<PermissionAnswer>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        () => resolve(remember(kind, "granted")),
        (e) => resolve(e.code === 1 ? remember(kind, "denied") : "prompt"),
        { timeout: 10000, maximumAge: 60000 },
      ),
    );
  } catch {
    return "unavailable";
  }
}

/** "Allow" on the intro screen: asks one by one. */
export async function requestAllPermissions(): Promise<void> {
  markPermissionsSeen();
  for (const k of KINDS) await requestPermission(k);
}

export { openAppSettings };
